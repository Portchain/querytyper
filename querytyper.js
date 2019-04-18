#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const queryTyperConfig = JSON.parse(fs.readFileSync('querytyper.config.json'))
const queryTsTemplate = fs.readFileSync(queryTyperConfig.queryTemplatePath, 'utf8')
const codegenWarning = '// WARNING: THIS CODE IS AUTO-GENERATED. ANY MANUAL EDITS WILL BE OVERWRITTEN WITHOUT WARNING\n'

function getQueryTs(queryName, argumentFields, resultFields, helperFunction, extraImports, extendResultString, extendArgString) {
  let contents = codegenWarning + queryTsTemplate
  contents = contents.replace(new RegExp('@extraImports', 'g'), extraImports.join('\n'))
  contents = contents.replace(new RegExp('@queryName', 'g'), queryName)
  contents = contents.replace(new RegExp('@argumentFields', 'g'), '  ' + argumentFields.join('\n  '))
  contents = contents.replace(new RegExp('@resultFields', 'g'), '  ' + resultFields.join('\n  '))
  contents = contents.replace(new RegExp('@helperFunction', 'g'), helperFunction)
  contents = contents.replace(new RegExp('@extendResult', 'g'), extendResultString)
  contents = contents.replace(new RegExp('@extendArg', 'g'), extendArgString)
  return contents
}

function getCodegenItems(sql) {
  codegenItems = []
  sql.split('\n').forEach(line => {
    const match = line.trim().match(new RegExp('--[\\s]*@([A-Za-z0-9]+)(?: (.*))?$'))
    if (match) {
      codegenItems.push({
        type: match[1],
        value: match[2],
      })
    }
  })
  return codegenItems
}

function writeIfChanged(filePath, fileContents) {
  try {
    const oldContents = fs.readFileSync(filePath, 'utf8')
    if (oldContents == fileContents) return
  } catch (error) {
    // File doesn't exist. Continue
  }
  fs.writeFileSync(filePath, fileContents)
  console.info(`querytyper: wrote ${filePath}`)
}

queryTyperConfig.rootDirs.forEach(rootDir => {
  fs.readdirSync(rootDir).forEach(dirItem => {
    dirItemAbs = path.join(rootDir, dirItem)
    if (!fs.statSync(dirItemAbs).isDirectory()) {
      return
    }

    const generatedQueryNames = []
    // Create new ts files
    fs.readdirSync(dirItemAbs).forEach(subdirItem => {
      subdirItemAbs = path.join(dirItemAbs, subdirItem)
      if (fs.statSync(subdirItemAbs).isDirectory() || !subdirItemAbs.endsWith('.query.sql')) {
        return
      }
      const sqlFile = fs.readFileSync(subdirItemAbs, 'utf8')
      const items = getCodegenItems(sqlFile)
      if (items.length == 0) {
        return
      }
      const extraImports = []
      let extendResultString = ''
      let extendArgString = ''
      const argumentFields = items.filter(item => item['type'] == 'arg').map(item => item['value'])
      const resultFields = items.filter(item => item['type'] == 'return').map(item => item['value'])
      const extendResult = items.filter(item => item['type'] == 'extendsResults').map(item => item['value'])
      const extendArg = items.filter(item => item['type'] == 'extendsArgs').map(item => item['value'])
      const helperFunction = items.filter(item => item['type'] == 'unique').length > 0 ? 'buildQueryWithUniqueResult' : 'buildQuery'
      const queryName = subdirItem.replace('.query.sql', '')
      if (items.filter(item => ['arg', 'return'].includes(item['type']) && item['value'].includes('Moment;')).length > 0) {
        // hack: import Moment if the argument string contains 'Moment'
        extraImports.push("import { Moment } from 'moment';")
      }

      if (items.filter(item => ['arg', 'return', 'extendsResults', 'extendsArgs'].includes(item['type']) && item['value'].includes('dt.')).length > 0) {
        extraImports.push(`import * as dt from '${queryTyperConfig.dataTypesPath}';`)
      }

      if (extendResult.length > 0) {
        extendResultString = ' extends ' + extendResult[0]
      }

      if (extendArg.length > 0) {
        extendArgString = ' extends ' + extendArg[0]
      }
      const fileName = queryName + '.query.ts'
      const filePath = path.join(dirItemAbs, fileName)
      const fileContents = getQueryTs(queryName, argumentFields, resultFields, helperFunction, extraImports, extendResultString, extendArgString)

      writeIfChanged(filePath, fileContents)
      generatedQueryNames.push(queryName)
    })
    // Delete old ts files
    fs.readdirSync(dirItemAbs).forEach(subdirItem => {
      subdirItemAbs = path.join(dirItemAbs, subdirItem)
      if (fs.statSync(subdirItemAbs).isDirectory() || !subdirItemAbs.endsWith('.query.ts')) {
        return
      }
      const tsFile = fs.readFileSync(subdirItemAbs, 'utf8')
      const queryName = subdirItem.replace('.query.ts', '')
      if (tsFile.startsWith(codegenWarning) && !generatedQueryNames.includes(queryName)) {
        fs.unlinkSync(subdirItemAbs)
        console.info(`querytyper: deleted ${subdirItemAbs}`)
      }
    })
    // Write exports file
    const exportsFileBody =
      generatedQueryNames.length > 0
        ? generatedQueryNames.map(queryName => `export { ${queryName}, Result as ${queryName}Result, Arguments as ${queryName}Args } from './${queryName}.query';`).join('\n') + '\n'
        : ''
    writeIfChanged(path.join(dirItemAbs, queryTyperConfig.exportsFileName), codegenWarning + exportsFileBody)
  })
})
