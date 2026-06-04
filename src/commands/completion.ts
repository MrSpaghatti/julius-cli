import { Command } from 'commander';
import chalk from 'chalk';
import { Output } from '../output/manager.js';

const BASH_COMPLETION = `
_julius_cli_completion() {
    local cur prev opts
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    opts="$(julius-cli --help | grep -E '^  [a-z]' | awk '{print $1}')"

    if [[ \${cur} == -* ]] ; then
            COMPREPLY=( $(compgen -W "$(julius-cli \${COMP_WORDS[1]} --help | grep -E '^  -' | awk '{print $1, $2}' | tr -d ',')" -- \${cur}) )
        return 0
    fi

    case "\${prev}" in
        auth|sources|sessions|activities|wait|config|templates|interactive|listen)
            COMPREPLY=( $(compgen -W "$(julius-cli \${prev} --help | grep -E '^  [a-z]' | awk '{print $1}')" -- \${cur}) )
            return 0
            ;;
        *)
            ;;
    esac

    COMPREPLY=( $(compgen -W "\${opts}" -- \${cur}) )
    return 0
}
complete -F _julius_cli_completion julius-cli
`;

const ZSH_COMPLETION = `
#compdef julius-cli

_julius_cli() {
    local -a commands
    commands=(
        'auth:Manage authentication'
        'sources:Manage code sources'
        'sessions:Manage AI sessions'
        'activities:View session activities'
        'wait:Wait for session completion'
        'config:Manage CLI configuration'
        'templates:Manage session templates'
        'interactive:Start interactive REPL'
        'listen:Start local webhook listener'
        'completion:Generate shell completion script'
    )

    if (( CURRENT == 2 )); then
        _describe -t commands 'command' commands
    else
        case $words[2] in
            auth)
                local -a subcommands
                subcommands=('login:Login via browser' 'logout:Logout' 'set:Set API key' 'status:Show auth status')
                _describe -t subcommands 'subcommand' subcommands
                ;;
            sources)
                local -a subcommands
                subcommands=('list:List sources' 'get:Get source' 'create:Create source' 'delete:Delete source')
                _describe -t subcommands 'subcommand' subcommands
                ;;
            sessions)
                local -a subcommands
                subcommands=('list:List sessions' 'get:Get session' 'create:Create session' 'cancel:Cancel session' 'delete:Delete session' 'diff:Show session changes' 'pull:Pull session changes')
                _describe -t subcommands 'subcommand' subcommands
                ;;
            *)
                _arguments '--help[Show help]' '--version[Show version]'
                ;;
        esac
    fi
}

_julius_cli "$@"
`;

export function createCompletionCommand(): Command {
  return new Command('completion')
    .description('Generate shell completion script')
    .argument('[shell]', 'Shell type (bash, zsh)', 'bash')
    .action((shell) => {
      if (shell === 'bash') {
        Output.write(BASH_COMPLETION);
      } else if (shell === 'zsh') {
        Output.write(ZSH_COMPLETION);
      } else {
        Output.error(chalk.red(`Unsupported shell: \${shell}. Supported: bash, zsh`));
        process.exit(1);
      }
    });
}
