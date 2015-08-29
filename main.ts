/// <reference path="typings/tsd.d.ts"/>

import path = require('path');
import fs = require('fs');

require('colors');

var dircompare = require('dir-compare');
var jsdiff = require('diff');

function pad(pad, str, padLeft) {
	if (typeof str === 'undefined') {
		return pad;
	}

	if (padLeft) {
		return (pad + str).slice(-pad.length);
	} else {
		return (str + pad).substring(0, pad.length);
	}
}

export function readFileSync(dest: string, encoding: string = 'utf8') {
	return fs.readFileSync(dest, {encoding: encoding});
}

function copyFileSync( source, target ) {
    var targetFile = target;
    if ( fs.existsSync( target ) ) {
        if ( fs.lstatSync( target ).isDirectory() ) {
            targetFile = path.join( target, path.basename( source ) );
        }
    }
    fs.writeFileSync(targetFile, readFileSync(source).replace(/\r?\n|\r/g, '\n'));
}

function copyFolderRecursiveSync( source, target ) {
    var files = [];
    var targetFolder = path.join( target, path.basename( source ) );
    if ( !fs.existsSync( targetFolder ) ) {
        fs.mkdirSync( targetFolder );
    }
    if ( fs.lstatSync( source ).isDirectory() ) {
        files = fs.readdirSync( source );
        files.forEach( function ( file ) {
            var curSource = path.join( source, file );
            if ( fs.lstatSync( curSource ).isDirectory() ) {
                copyFolderRecursiveSync( curSource, targetFolder );
            } else {
                copyFileSync( curSource, targetFolder );
            }
        } );
    }
}

function assertDiff(expected, actual) {
	var res = dircompare.compareSync(expected, actual, {
		compareSize: true,
		compareContent: true
	});

	res.diffSet.forEach((entry) => {
		var state = {
			'equal' : '==',
			'left' : '->',
			'right' : '<-',
			'distinct' : '<>'
		}[entry.state];
		var name1 = entry.name1 ? entry.name1 : '';
		var name2 = entry.name2 ? entry.name2 : '';
		var space = '                                ';
		console.log('        - ' + pad(space, name1 + '(' + entry.type1.cyan + ') ', true)
				+ state + ' ' + pad(space, name2 + '(' + entry.type2.cyan + ')', true));

		if (entry.state === 'distinct') {
			var diff = jsdiff.diffChars(
				readFileSync(path.join(entry.path1, entry.name1)),
				readFileSync(path.join(entry.path2, entry.name2)));

			diff.forEach(function(part) {
				var color = part.added
					? 'green'
					: part.removed
						? 'red'
						: 'magenta';
				process.stderr.write(part.value[color]);
			});
		}
	});

    console.log(res.differences);
}

copyFolderRecursiveSync('./case/expected', './case/diff');
copyFolderRecursiveSync('./case/result', './case/diff');

assertDiff('./case/diff/expected', './case/diff/result');
