const fs = require('fs');
const path = require('path');

const regions = require('@svg-maps/france.regions');
const departments = require('@svg-maps/france.departments');

const outDir = path.join(__dirname, 'src', 'lib');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const outFile = path.join(outDir, 'france-maps.ts');

const content = `export interface Location { id: string; name: string; path: string; }
export interface MapData { label: string; viewBox: string; locations: Location[]; }

export const franceRegionsMap: MapData = ${JSON.stringify(regions.default || regions, null, 2)};
export const franceDepartmentsMap: MapData = ${JSON.stringify(departments.default || departments, null, 2)};
`;

fs.writeFileSync(outFile, content);
console.log('Successfully generated france-maps.ts at ' + outFile);