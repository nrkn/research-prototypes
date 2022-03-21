import { promises } from 'fs'
import { posix } from 'path'
import { parseMeta } from './parse-meta'

const { readdir, stat, mkdir, readFile, writeFile, copyFile } = promises
const { join } = posix

const projectRoot = '../projects'
const docsRoot = '../docs'

const isDir = async (p: string) => (await stat(p)).isDirectory()

const filter = async <T>(
  values: T[],
  predicate: (value: T) => Promise<boolean>
) => {
  const result: T[] = []

  for (const v of values) {
    if (await predicate(v)) result.push(v)
  }

  return result
}

const getProjectNames = async () => {
  const dirNames = await readdir('../projects')

  return filter(dirNames, n => isDir(join(projectRoot, n)))
}

const buildProject = async (name: string) => {
  const sourceDir = join(projectRoot, name)
  const destDir = join( docsRoot, name )


  // each should have a readme.md and _meta.txt
  // if not - let it throw
  const readme = await readFile(join(sourceDir, 'readme.md'), 'utf8')
  const metaText = await readFile(join(sourceDir, '_meta.txt'), 'utf8')

  const meta = parseMeta( metaText )

  console.log({ meta })

  // safe mkdir
  await mkdir( destDir, { recursive: true })

  // add {{project-name}}/readme.md
  // here is your chance to decorate readme - but don't, for now
  await writeFile( join( destDir, 'readme.md' ), readme, 'utf8' )
  
  // if meta livedemo file, copy file to {{project-name}}/livedemo.html
  if( meta.liveDemoFile ){
    await copyFile( 
      join( sourceDir, meta.liveDemoFile ),  
      join( destDir, 'livedemo.html' )
    ) 
  }

  if( meta.liveDemoDir ){
    throw Error( 'meta.liveDemoDir not implemented' )
  }

  return [name, { readme, meta }] as const
}

const start = async () => {
  // get a list of projects
  const projectNames = await getProjectNames()

  const projectData = await Promise.all(projectNames.map(buildProject))

  // build docs/readme.md index (can do metadata stuff later from tags etc)
  
  const indexLinks = projectNames.map(
    n => ` - [${ n }](${ n })`
  ).join( '\n' )

  const index = `## projects\n\n${ indexLinks }\n`

  await writeFile( join( docsRoot, 'readme.md' ), index, 'utf8' )

  console.log({ projectNames })
}

start().catch(console.error)
