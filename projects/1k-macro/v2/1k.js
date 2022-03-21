var _ = require( 'underscore' );

function parse( filename, readFile, callback ){
  var tests = {  
    allStatements: /^[\!\&\$\_\@]?\w+\s/gm,
    allTokens: /[\!\&\$\_\@]\w+/g,
    allComments: /^\/\/.*$/gm,
    allMacros: /^\&\w+/gm,
    allFns: /^\_\w+/gm,
    macro: /^\&\w+$/m,
    macroToken: /\&\w+/g,
    fnName: /^\$\w+$/m,
    expression: /^(?!\_)\w+$/m,
    directive: /^\!\w+$/m,
    fn: /^\_\w+$/m,
    fnToken: /\_\w+/g,
    allDirectiveRequires: /^\!require\s+.+$/gm,
    variable: /^\@\w+$/m,
    variableToken: /\@\w+/g,
    argToken: /\@arg\d+/g
  };

  _.mixin({
    removeComments: function( text ){
      return text.split( tests.allComments ).join( '' );
    },
    statementKeys: function( text ){
      return _( text.match( tests.allStatements ) ).map( function( s ){
        return s.trim();
      });        
    },
    statements: function( text ){
      return _( text.split( tests.allStatements ) ).chain().map( function( s ){
        return s.trim();
      }).filter( function( s ){
        return s !== '';
      }).value();
    },
    statementTokens: function( text, test ){
      return text.match( !_( test ).isUndefined()? test : tests.allTokens );
    }
  });

  function textToStatements( text, map, callback ){  
    text = _( text ).removeComments();
    
    var keys = _( text ).statementKeys();  
    var statements = _( text ).statements();
    
    if( keys.length !== statements.length ){
      throw 'OH NOES';
    }
    
    callback( 
      _( map ).extend( _( keys ).object( statements ) ) 
    );
  }

  function categorize( statements, callback ){
    var data = {
      statements: statements,
      keys: {
      }
    };  

    var allKeys = _( statements ).keys();
    
    _.mixin({
      addStatements: function( obj ){
        var testNames = _( arguments ).toArray().slice( 1 );
        
        testNames.forEach( function( name ){
          var keys = allKeys.filter( function( key ){
            return tests[ name ].test( key );
          });
          
          if( !_( obj.keys[ name ] ).isArray() ){
            obj.keys[ name ] = [];
          }
          
          obj.keys[ name ] = _( obj.keys[ name ].concat( keys ) ).uniq();
        });      
      }
    });
    
    _( data ).addStatements( 'macro', 'fn', 'fnName', 'expression', 'directive', 'variable' );
    
    callback( data );
  }

  readFile( filename, function( text ){
    function process( callback ){    
      var requires = text.match( tests.allDirectiveRequires );
      
      if( requires && requires.length ){
        var require = requires[ 0 ];
        var parts = require.split( /\s+/g );
        var key = parts[ 0 ].trim();
        var filename = parts[ 1 ].trim();

        readFile( filename, function( str ){
          text = text.split( require ).join( str );
          process( callback );
        });
        
        return;
      }
      
      callback( text );
    }
    
    process( function( text ){
      textToStatements( text, {}, function( statements ){
        categorize( statements, function( categorized ){
          var vars = _( categorized.keys.variable ).map( function( key ){
            return key + ' = ' + categorized.statements[ key ];
          });
          
          var blocks = _( categorized.keys.expression ).map( function( key ){
            return categorized.statements[ key ];
          });      
          
          var script = vars.concat( blocks ).join( ';\n' );
          
          var fnsAdded = [];
          
          function addFunction( text, key ){
            if( _( fnsAdded ).contains( key ) ) return text;
            
            fnsAdded.push( key );
            
            var body = categorized.statements[ key ];
            
            body = processMacros( body );
            
            var fn = key + ' = function(!args){\n  ' + body + '\n};\n';
            
            _( getFns( body ) ).each( function( key ){
              text = addFunction( text, key );
            });
            
            return fn + text;
          }
          
          function processMacros( text ){
            var macros = _( text ).chain().statementTokens( tests.macroToken ).uniq().sortBy(
              function( m ){
                return m.length;
              }
            ).value();        
          
            while( macros.length ){
              var macro = macros[ macros.length - 1 ];
              text = text.split( macro ).join( categorized.statements[ macro ] );
              macros = _( text ).chain().statementTokens( tests.macroToken ).uniq().value();
            }          
            
            return text;
          }
          
          function getFns( text ){
            return _( text ).chain().statementTokens( tests.fnToken ).uniq().value();                
          }
          
          script = processMacros( script );
          
          var includes = _( categorized.keys.directive ).chain().filter( function( key ){
            return key === '!include';
          }).map( function( key ){
            return categorized.statements[ key ];
          }).value();
          
          _( includes.concat( getFns( script ) ) ).chain().uniq().each( function( key ){
            script = addFunction( script, key );
          });
          
          

          var args = _( script.match( tests.argToken ) ).uniq();
          var vars = _( script.match( tests.variableToken ) ).uniq();        
          var fns = _( script.match( tests.fnToken ) ).uniq();
          
          vars = _( vars ).difference( args );
          
          var names = 'defghiklmnopqrstuvwxyz';
          
          if( _( categorized.statements ).has( '!names' ) ){
            names = categorized.statements[ '!names' ];
          }
          
          names = names.split( '' );
          
          if( args.length + vars.length + fns.length > names.length ){
            throw 'Need to provide more variable names';
          }
          
          var map = {};
          
          script = script.split( '!args' ).join( ' ' + args.join( ', ' ) + ' ' );
          
          while( args.length ){
            var arg = args.shift();
            var n = names.shift();
            map[ arg ] = n;
          }
          
          while( vars.length ){
            var variable = vars.shift();
            var n = names.shift();
            map[ variable ] = n;
          }
          
          while( fns.length ){
            var fnName = fns.shift();
            var key = fnName.replace( /^_/m, '$' );
            
            if( _( categorized.keys.fnName ).contains( key ) ){              
              var n = categorized.statements[ key ];
            } else {
              var n = names.shift();
            }
            
            map[ fnName ] = n;
          }
          
          _( map ).each( function( value, key ){
            script = script.split( key ).join( value );
          });
          
          callback( script );
        });
      });      
    });
  });  
}

module.exports = parse;