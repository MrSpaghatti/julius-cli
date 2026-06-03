export interface Template {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  variables?: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
}
