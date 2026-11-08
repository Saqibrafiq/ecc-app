// Windows caps a command line at ~8,191 characters; a large commit's absolute file paths exceed
// that. Split the file list into chunks well below the limit, one command per chunk.
const MAX_ARGS_LENGTH = 6_000

function chunk(files) {
  const chunks = [[]]
  let length = 0

  for (const file of files) {
    const argument = `"${file}"`
    const current = chunks.at(-1)
    if (current.length > 0 && length + argument.length + 1 > MAX_ARGS_LENGTH) {
      chunks.push([argument])
      length = argument.length
    } else {
      current.push(argument)
      length += argument.length + 1
    }
  }

  return chunks
}

const commandsFor = (command) => (files) =>
  chunk(files).map((arguments_) => `${command} ${arguments_.join(' ')}`)

const config = {
  '*.{ts,tsx,mts,js,mjs,cjs}': (files) => [
    ...commandsFor('eslint --fix --no-warn-ignored')(files),
    ...commandsFor('prettier --write')(files),
  ],
  '*.{json,md,css,yml,yaml}': commandsFor('prettier --write'),
}

export default config
