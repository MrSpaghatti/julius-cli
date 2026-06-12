import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { readFile } from "node:fs/promises";
import { SessionsAPI } from "../api/sessions.js";
import { config } from "../config/index.js";
import { Output } from "../output/manager.js";
import { outputFormatted } from "../output/formatter.js";
import { createSession } from "../services/sessionService.js";
import { CLIError, ExitCode } from "../utils/errors.js";
import { getClient } from "../utils/client.js";
import { waitCommand } from "./wait.js";
import type { OutputFormat } from "../cli/types.js";
import type { CreateSessionParams } from "../services/sessionService.js";

interface BatchEntry {
	prompt: string;
	repo?: string;
	title?: string;
	branch?: string;
	autoPr?: boolean;
	requireApproval?: boolean;
}

function parseBatchInput(data: string, defaultRepo?: string): BatchEntry[] {
	const trimmed = data.trim();
	if (!trimmed) {
		throw new CLIError("Batch file is empty", ExitCode.INVALID_ARGS);
	}

	if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
		const parsed = JSON.parse(trimmed);
		const entries = Array.isArray(parsed) ? parsed : [parsed];
		return entries.map((e: Record<string, unknown>) => {
			if (!e.prompt || typeof e.prompt !== "string") {
				throw new CLIError(
					'Each batch entry must have a "prompt" string field',
					ExitCode.INVALID_ARGS,
				);
			}
			return {
				prompt: e.prompt,
				repo: (e.repo as string) || defaultRepo,
				title: e.title as string | undefined,
				branch: e.branch as string | undefined,
				autoPr: !!e.autoPr,
				requireApproval: !!e.requireApproval,
			};
		});
	}

	return trimmed
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("#"))
		.map((prompt) => ({ prompt, repo: defaultRepo }));
}

async function handleBatchCreate(
	filePath: string,
	options: {
		repo?: string;
		titlePrefix?: string;
		wait?: boolean;
		follow?: boolean;
		concurrency?: string;
		format: OutputFormat;
	},
) {
	const data = await readFile(filePath, "utf-8");
	const entries = parseBatchInput(data, options.repo);

	if (entries.length === 0) {
		throw new CLIError(
			"No valid entries found in batch file",
			ExitCode.INVALID_ARGS,
		);
	}

	const concurrency = Math.min(
		Math.max(1, parseInt(options.concurrency || "5", 10) || 5),
		20,
	);
	const format = options.format;
	const createdSessions: Array<{
		entry: BatchEntry;
		session: { id: string; title?: string };
	}> = [];
	const errors: Array<{ entry: BatchEntry; error: string }> = [];

	const totalSpinner =
		format === "pretty"
			? ora(`Creating ${entries.length} sessions...`).start()
			: null;

	for (let i = 0; i < entries.length; i += concurrency) {
		const batch = entries.slice(i, i + concurrency);
		const results = await Promise.allSettled(
			batch.map(async (entry) => {
				const title =
					entry.title ||
					(options.titlePrefix
						? `${options.titlePrefix} ${i + batch.indexOf(entry) + 1}`
						: undefined);

				const params: CreateSessionParams = {
					repo: entry.repo,
					prompt: entry.prompt,
					title,
					branch: entry.branch,
					autoPr: entry.autoPr,
					requireApproval: entry.requireApproval,
					format,
				};

				return createSession(params);
			}),
		);

		for (let j = 0; j < results.length; j++) {
			const result = results[j];
			const entry = batch[j];
			if (result.status === "fulfilled") {
				createdSessions.push({ entry, session: result.value.session });
				if (totalSpinner) {
					totalSpinner.text = `Created ${createdSessions.length}/${entries.length} sessions...`;
				}
			} else {
				errors.push({
					entry,
					error: result.reason?.message || "Unknown error",
				});
			}
		}
	}

	if (totalSpinner) {
		const status = errors.length === 0 ? "succeed" : "warn";
		totalSpinner[status](
			`Created ${createdSessions.length}/${entries.length} sessions${errors.length > 0 ? ` (${errors.length} failed)` : ""}`,
		);
	}

	if (format === "pretty" && createdSessions.length > 0) {
		Output.info("");
		Output.info(chalk.bold("Created Sessions:"));
		for (const { entry, session } of createdSessions) {
			const repo = entry.repo ? ` [${entry.repo}]` : "";
			Output.info(
				`  ${chalk.cyan(session.id.slice(0, 20))}${repo}: ${entry.prompt.slice(0, 60)}${entry.prompt.length > 60 ? "..." : ""}`,
			);
		}
	} else if (createdSessions.length > 0) {
		outputFormatted(
			{
				kind: "sessions",
				sessions: createdSessions.map(
					(s) => s.session as import("../api/types.js").Session,
				),
			},
			format,
		);
	}

	if (errors.length > 0 && format === "pretty") {
		Output.error(chalk.red(`\nFailed entries:`));
		for (const { entry, error } of errors) {
			Output.error(chalk.red(`  ${entry.prompt.slice(0, 60)}: ${error}`));
		}
	}

	if (options.wait || options.follow) {
		if (format === "pretty") {
			Output.info(
				chalk.bold(`\nWaiting for ${createdSessions.length} sessions...`),
			);
		}

		const client = await getClient();
		const colors = [
			chalk.blue,
			chalk.magenta,
			chalk.cyan,
			chalk.yellow,
			chalk.green,
		];
		const waitPromises = createdSessions.map(({ session }, index) => {
			const color = colors[index % colors.length];
			const prefix =
				createdSessions.length > 1
					? color(`[${session.id.slice(0, 12)}] `)
					: undefined;
			return waitCommand(client, {
				sessionId: session.id,
				format,
				follow: true,
				interval: config.getRequired("pollInterval") / 1000,
				timeout:
					(config.getRequired("maxPollAttempts") *
						config.getRequired("pollInterval")) /
					1000,
				noSpinner: createdSessions.length > 1,
				prefix,
			});
		});

		const waitResults = await Promise.allSettled(waitPromises);
		const waitFailed = waitResults.filter((r) => r.status === "rejected");
		if (waitFailed.length > 0) {
			if (format === "pretty") {
				Output.error(
					chalk.red(`\n${waitFailed.length} session(s) failed during wait:`),
				);
			}
			if (errors.length > 0 || waitFailed.length > 0) {
				process.exit(ExitCode.GENERAL_ERROR);
			}
		} else if (format === "pretty") {
			Output.info(
				chalk.green(`\nAll ${createdSessions.length} sessions completed.`),
			);
		}
	}

	if (errors.length > 0) {
		process.exit(ExitCode.GENERAL_ERROR);
	}
}

async function handleBatchCancel(
	sessionIds: string[],
	options: { format: OutputFormat },
) {
	const client = await getClient();
	const api = new SessionsAPI(client);
	const format = options.format;

	const spinner =
		format === "pretty"
			? ora(`Cancelling ${sessionIds.length} sessions...`).start()
			: null;

	const results = await Promise.allSettled(
		sessionIds.map((id) => api.cancel(id)),
	);

	const succeeded: string[] = [];
	const failed: Array<{ id: string; error: string }> = [];

	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result.status === "fulfilled") {
			succeeded.push(sessionIds[i]);
		} else {
			failed.push({
				id: sessionIds[i],
				error:
					(result as PromiseRejectedResult).reason?.message || "Unknown error",
			});
		}
	}

	if (spinner) {
		const status = failed.length === 0 ? "succeed" : "warn";
		spinner[status](
			`Cancelled ${succeeded.length}/${sessionIds.length} sessions`,
		);
	}

	if (format === "pretty") {
		if (succeeded.length > 0) {
			Output.info("");
			Output.info(chalk.bold("Cancelled:"));
			for (const id of succeeded) {
				Output.info(`  ${chalk.green(id.slice(0, 20))}`);
			}
		}
		if (failed.length > 0) {
			Output.error(chalk.red("\nFailed:"));
			for (const { id, error } of failed) {
				Output.error(chalk.red(`  ${id.slice(0, 20)}: ${error}`));
			}
		}
	} else {
		outputFormatted(
			{
				kind: "sessions",
				sessions: succeeded.map((id) => ({
					id,
					name: id,
				})) as import("../api/types.js").Session[],
			},
			format,
		);
	}

	if (failed.length > 0) {
		process.exit(ExitCode.GENERAL_ERROR);
	}
}

async function handleBatchPull(
	sessionIds: string[],
	options: { format: OutputFormat },
) {
	const client = await getClient();
	const api = new SessionsAPI(client);
	const format = options.format;

	const spinner =
		format === "pretty"
			? ora(`Fetching ${sessionIds.length} sessions...`).start()
			: null;

	const sessions = await Promise.allSettled(
		sessionIds.map((id) => api.get(id)),
	);

	const succeeded: Array<{ id: string; branch?: string }> = [];
	const failed: Array<{ id: string; error: string }> = [];

	for (let i = 0; i < sessions.length; i++) {
		const id = sessionIds[i];
		const result = sessions[i];
		if (result.status === "fulfilled") {
			const session = result.value;
			const output = session.outputs?.[0];
			succeeded.push({ id, branch: output?.branch?.name });
		} else {
			failed.push({
				id,
				error:
					(result as PromiseRejectedResult).reason?.message || "Unknown error",
			});
		}
	}

	if (spinner) {
		spinner.succeed(
			`Fetched ${succeeded.length}/${sessionIds.length} sessions`,
		);
	}

	if (format === "pretty") {
		for (const { id, branch } of succeeded) {
			if (branch) {
				Output.info(
					`  ${chalk.cyan(id.slice(0, 20))} → branch: ${chalk.green(branch)}`,
				);
			} else {
				Output.info(
					`  ${chalk.cyan(id.slice(0, 20))} → ${chalk.yellow("no branch output")}`,
				);
			}
		}
		if (failed.length > 0) {
			Output.error(chalk.red("\nFailed:"));
			for (const { id, error } of failed) {
				Output.error(chalk.red(`  ${id.slice(0, 20)}: ${error}`));
			}
		}
	} else {
		outputFormatted(
			{
				kind: "sessions",
				sessions: succeeded.map((s) => ({
					id: s.id,
					name: s.id,
				})) as import("../api/types.js").Session[],
			},
			format,
		);
	}

	if (failed.length > 0) {
		process.exit(ExitCode.GENERAL_ERROR);
	}
}

export function createSessionsBatchCommands(): Command[] {
	const batchCreate = new Command("batch-create")
		.description("Create multiple sessions from a JSON or text file")
		.argument(
			"<file>",
			"Path to batch file (JSON array or text file with one prompt per line)",
		)
		.option(
			"-r, --repo <repo>",
			"Default repository (owner/repo) for all entries",
		)
		.option("--title-prefix <prefix>", "Prefix for auto-generated titles")
		.option("-w, --wait", "Wait for all sessions to complete after creation")
		.option("--follow", "Stream activity updates while waiting")
		.option(
			"--concurrency <n>",
			"Number of sessions to create in parallel (default: 5)",
			"5",
		)
		.option(
			"--format <format>",
			"Output format (json|pretty|quiet|table)",
			config.get("defaultFormat") || "json",
		)
		.action(handleBatchCreate);

	const batchCancel = new Command("batch-cancel")
		.description("Cancel multiple sessions by ID")
		.argument("<session-ids...>", "Session IDs to cancel")
		.option(
			"--format <format>",
			"Output format (json|pretty|quiet|table)",
			config.get("defaultFormat") || "json",
		)
		.action(handleBatchCancel);

	const batchPull = new Command("batch-pull")
		.description("Show branch info for multiple completed sessions")
		.argument("<session-ids...>", "Session IDs to inspect")
		.option(
			"--format <format>",
			"Output format (json|pretty|quiet|table)",
			config.get("defaultFormat") || "json",
		)
		.action(handleBatchPull);

	return [batchCreate, batchCancel, batchPull];
}
