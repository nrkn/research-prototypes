
export const parseMeta = ( metaText: string ) => {
  const lines = trimEmpty( metaText.split( '\n' ) )

  const meta: Partial<Meta> & Record<string,string> = {}

  for( const line of lines ){
    const [ key, ...rest ] = line.split( ':' )

    const value = rest.join( ':' ).trim()
    
    if( key === 'date' ){
      meta.date = new Date( value )  
      continue
    }

    if( key === 'tags' ){
      meta.tags = trimEmpty(value.split( ',' ) )
      continue
    }

    meta[ key ] = value
  }

  return meta
}

const trimEmpty = ( values: string[] ) => 
  values.map( s => s.trim() ).filter( s => s !== '' )

export type Meta = {
  date: Date
  tags: string[]  
  liveDemoFile?: string
  liveDemoDir?: string
} 
