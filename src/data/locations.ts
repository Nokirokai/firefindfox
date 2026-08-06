export interface LocationGroup {
  group: string
  options: { label: string; value: string }[]
}

// A few labels repeat across campuses (Student Center, Covered Court, Campus
// Parking Area), so those store a campus-qualified value while still reading
// plainly under their group heading.
export const LOCATION_GROUPS: LocationGroup[] = [
  {
    group: 'TSU Main Campus (San Vicente)',
    options: [
      { label: 'TSU Main Gate', value: 'TSU Main Gate' },
      { label: 'TSU Back Gate', value: 'TSU Back Gate' },
      { label: 'TSU Gymnasium', value: 'TSU Gymnasium' },
      { label: 'Heroes Park', value: 'Heroes Park' },
      { label: 'Main Library Entrance', value: 'Main Library Entrance' },
      { label: 'Business Center', value: 'Business Center' },
      { label: 'Student Center', value: 'Student Center, Main Campus' },
      { label: 'CASS Building Entrance', value: 'CASS Building Entrance' },
      { label: 'CBA Building Entrance', value: 'CBA Building Entrance' },
      { label: 'Engineering (COE) Gate', value: 'Engineering (COE) Gate' },
      { label: 'CCS Gate', value: 'CCS Gate' },
      { label: 'Bulwagang Kanlahi (outside TSU)', value: 'Bulwagang Kanlahi (outside TSU)' },
      { label: 'Romulo Boulevard Waiting Shed', value: 'Romulo Boulevard Waiting Shed' },
    ],
  },
  {
    group: 'TSU San Isidro Campus',
    options: [
      { label: 'TSU San Isidro Main Gate', value: 'TSU San Isidro Main Gate' },
      { label: 'San Isidro Guard House', value: 'San Isidro Guard House' },
      { label: 'CCS Building Entrance', value: 'CCS Building Entrance' },
      { label: 'CAFA Building Entrance', value: 'CAFA Building Entrance' },
      { label: 'Library Entrance', value: 'Library Entrance, San Isidro' },
      { label: 'Covered Court', value: 'Covered Court, San Isidro' },
      { label: 'Student Waiting Area', value: 'Student Waiting Area' },
      { label: 'Campus Parking Area', value: 'Campus Parking Area, San Isidro' },
      { label: 'San Isidro Jeepney/Tricycle Stop', value: 'San Isidro Jeepney/Tricycle Stop' },
    ],
  },
  {
    group: 'TSU Lucinda Campus',
    options: [
      { label: 'Lucinda Gate 1 (Main Entrance)', value: 'Lucinda Gate 1 (Main Entrance)' },
      { label: 'Lucinda Gate 2', value: 'Lucinda Gate 2' },
      { label: 'Alumni Center', value: 'Alumni Center' },
      { label: 'University Hotel Lobby', value: 'University Hotel Lobby' },
      { label: 'Student Center', value: 'Student Center, Lucinda' },
      { label: 'Jose V. Yap Library', value: 'Jose V. Yap Library' },
      { label: 'Academic Building Entrance', value: 'Academic Building Entrance' },
      { label: 'College of Education Building', value: 'College of Education Building' },
      { label: 'College of Science Building', value: 'College of Science Building' },
      { label: 'CCJE Building', value: 'CCJE Building' },
      { label: 'Covered Court', value: 'Covered Court, Lucinda' },
      { label: 'ROTC Grounds Entrance', value: 'ROTC Grounds Entrance' },
      { label: 'Campus Parking Area', value: 'Campus Parking Area, Lucinda' },
    ],
  },
  {
    group: 'Nearby Public Meet-up Spots',
    options: [
      { label: 'CityWalk Tarlac', value: 'CityWalk Tarlac' },
      { label: 'SM City Tarlac', value: 'SM City Tarlac' },
      { label: 'Robinsons Luisita', value: 'Robinsons Luisita' },
      { label: 'Siesta Terminal', value: 'Siesta Terminal' },
      { label: 'Tarlac City Public Market', value: 'Tarlac City Public Market' },
      { label: "McDonald's Romulo Blvd.", value: "McDonald's Romulo Blvd." },
      { label: 'Jollibee Romulo Blvd.', value: 'Jollibee Romulo Blvd.' },
      { label: '7-Eleven Romulo Blvd.', value: '7-Eleven Romulo Blvd.' },
    ],
  },
]

export const DEFAULT_LOCATION = LOCATION_GROUPS[0].options[0].value

export const ALL_LOCATIONS = LOCATION_GROUPS.flatMap((g) =>
  g.options.map((o) => ({ ...o, group: g.group }))
)
