import fs from 'fs';

const map = JSON.parse(fs.readFileSync('dist/assets/index-Mib2DY8e.js.map', 'utf8'));
const sources = map.sources;
console.log("Sources:", sources.length);

// Instead of using source-map package, we can just search the minified file for `Uncaught ReferenceError` patterns,
// or we can search `dist/assets/index-Mib2DY8e.js` for "Cannot access" ... wait, the error is THROWN by the engine.

const code = fs.readFileSync('dist/assets/index-Mib2DY8e.js', 'utf8');

// The V8 error says: Cannot access 'm' before initialization at nwe (index-DOAz6xGv.js:86:89317)
// So we just need to find the function `nwe` or what line 86 column 89317 is roughly about in my local build.
// Actually my local build might not have exactly `nwe` and `89317`.
// But I can find `m` before initialization if there's a TDZ. 
// A TDZ occurs when a let/const is accessed before it's lexically declared.
// Since Rollup hoists variables, this only happens with circular dependencies or edge cases.

console.log("We need to look for circular dependencies in the Rollup bundle.");
