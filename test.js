const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DELIMITER = 'bhalh';

const cmd = spawn('git', ['log', `--format=${DELIMITER}%ae%n%b`], { cwd: path.resolve(__dirname, '../../Thumbtack/website/') });

let buffer;

cmd.stdout.on('data', (data) => {
    if (buffer) {
        buffer = Buffer.concat([buffer, data]);
    } else {
        buffer = data;
    }
});

cmd.on('close', () => {
    let results = buffer.toString().split(DELIMITER);
    // results = results.slice(0, 10000);
    const allParties = new Set();

    let links = _.filter(_.flatMap(_.compact(results), (result) => {
        const lines = result.split('\n');
        const authorLine = lines[0];

        const match = authorLine.match(/(^[a-z0-9]+)@thumbtack.com/i);
        if (!match) {
            return;
        }
        const author = match[1].toLowerCase();

        return lines
            .filter((line) => {
                return _.startsWith(line, 'Reviewed-by');
            })
            .map((reviewerLine) => {
                const match = reviewerLine.match(/<([a-z0-9.]+)@(?:ttc.)?thumbtack.com>/i);
                if (!match) {
                    console.log(reviewerLine);
                }
                const reviewer = match[1].toLowerCase();
                return { source: author, target: reviewer };
            });
    }));

    links = _.filter(
        _.map(
            _.countBy(links, (link) => [link.source, link.target].sort().join(DELIMITER)),
            (count, countKey) => {
                const [source, target] = countKey.split(DELIMITER);
                return { source, target, value: count };
            }
        ),
        (link) => link.value >= 2
    );

    _.each(links, (link) => {
        allParties.add(link.source);
        allParties.add(link.target);
    });

    const nodes = _.map(Array.from(allParties), (author) => {
        return { id: author };
    });

    fs.writeFile(
        'test.json',
        JSON.stringify({
            nodes,
            links,
        }, null, 2),
        (error) => console.log(error || 'Yay'),
    );
});
