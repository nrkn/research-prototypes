var fs = require( 'fs' );
var parse = require( './1k' );

var infile = process.argv[ 2 ];
var noMin = process.argv[ 3 ];

function readFile( filename, callback ){
  fs.readFile( filename + '.1k', 'utf-8', function( err, data ){
    if( err ) throw err;
    
    callback( data );    
  });  
}

parse( infile, readFile, function( script ){
  console.log( noMin ? script : script.replace( /\s/g, '' ) );
});