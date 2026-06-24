export interface Bareme {
  tarifParCategorie: Record<string, number>
  equivalencesEquipements: { eau: number; gaz: number; electricite: number; ascenseur: number; parSanitaire: number }
}

export const DEFAULT_BAREME: Bareme = {
  tarifParCategorie: { '1': 12, '2': 10, '3': 8, '4': 6, '5': 5, '6': 4, '7': 3, '8': 2 },
  equivalencesEquipements: { eau: 4, gaz: 2, electricite: 2, ascenseur: 3, parSanitaire: 3 },
}
