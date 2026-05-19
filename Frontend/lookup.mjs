import fs from 'fs';
import { SourceMapConsumer } from 'source-map';

const rawSourceMap = JSON.parse(fs.readFileSync('dist/assets/index-Mib2DY8e.js.map', 'utf8'));

async function lookup() {
    try {
        await SourceMapConsumer.with(rawSourceMap, null, consumer => {
            const pos = consumer.originalPositionFor({
                line: 86,
                column: 89317
            });
            console.log(pos);
            
            // Try nearby columns if that fails
            for(let i=89310; i<89325; i++) {
                const p = consumer.originalPositionFor({ line: 86, column: i });
                if(p.source) console.log(`Col ${i}:`, p);
            }
        });
    } catch(err) {
        console.error(err);
    }
}
lookup();
