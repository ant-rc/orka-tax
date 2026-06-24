export interface FieldDef {
  key: string;
  label: string;
}

export interface ActiveFilter {
  id: string;
  field: string;
  label: string;
  value: string;
}
