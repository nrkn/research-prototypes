node build %1 nomin > tmp/debug.js
node build %1 > tmp/out.js
node regPack tmp/out.js --crushGainFactor 1 --crushLengthFactor 0 --crushCopiesFactor 0 > tmp/packed.js
node packToShim tmp/packed.js > %2
node packToShim tmp/debug.js > tmp/debug.html