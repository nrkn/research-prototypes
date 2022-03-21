var fs = require( 'fs' );

var infile = process.argv[ 2 ];

fs.readFile( infile, 'utf-8', function( err, script ){
  if( err ) throw err;
  
  fs.readFile( 'shim.html', 'utf-8', function( err, shim ){
    if( err ) throw err;
    
    console.log( shim.split( '!packed' ).join( script ) )
  });
});