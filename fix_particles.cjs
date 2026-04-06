const fs = require('fs');
const file = 'src/components/ParticlesCursor.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace("import React from 'react';", "import React, { useRef, useEffect } from 'react';\n");
content = content.replace(/React\.useRef/g, 'useRef');
content = content.replace(/React\.useEffect/g, 'useEffect');
fs.writeFileSync(file, content);
