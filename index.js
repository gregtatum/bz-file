const Table = require('cli-table')
const toPairs = require('lodash.pairs')
const inquirer = require('inquirer')
const fetch = require('node-fetch')
const config = getConfig()
const co = require('co')
const open = require('opn')

co(function* () {
  const answers = yield askForDetails()
  yield confirmAnswers(answers)
  const {id} = yield postBug(answers)
  openBugUrl(id)
  process.exit()
})
.catch(outputErrors)

function openBugUrl (id) {
  return open(config.bugUrl.replace('$0', id))
}

function outputErrors (error) {
  console.error('The bug was not filed.')
  if (error) {
    console.error(error)
  }
}

function getConfig () {
  let config
  try {
    config = require('./config')
  } catch (e) {
    console.error(e)
    console.error('')
    console.error('./config.js has not yet been created. Check the README.md for more info.')
    process.exit()
  }
  return config
}

function post (urlPath, data) {
  return fetch(config.restUrl + '/' + urlPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BUGZILLA-API-KEY': config.apiKey
    },
    body: JSON.stringify(data)
  })
  .then(response => {
    if (response.status === 200) {
      return response.json()
    }
    return Promise.reject(`${response.status}: ${response.statusText} \n ${response.text()}`)
  })
}

function postBug ({component, summary, description, priority}) {
  console.log('')
  console.log('Hang tight, the bug is being posted.')

  return post('bug', {
    // api_key: config.apiKey,
    product: config.product,
    version: 'unspecified',
    component,
    summary,
    description,
    priority
  })
}

function askForDetails () {
  return inquirer.prompt([
    {
      type: 'list',
      name: 'component',
      message: `Select component for ${config.product}:`,
      choices: config.components
    },
    {
      name: 'summary',
      message: 'Summary or title of bug:'
    },
    {
      type: 'list',
      name: 'priority',
      message: 'Priority:',
      default: 'P2',
      choices: [
        'P1',
        'P2',
        'P3',
        'P4',
        'P5',
        '--'
      ]
    },
    {
      type: 'editor',
      message: 'Description of the bug:',
      name: 'description'
    }
  ])
}

function confirmAnswers (answers) {
  const table = new Table()

  table.push(
    ...toPairs(answers)
    .filter(([key]) => key !== 'description')
    .map(([key, value]) => {
      const obj = {}
      obj[key] = value
      return obj
    })
  )

  console.log(table.toString())
  console.log(answers.description)

  return inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Do you want to submit this information?'
  }])
  .then(({confirm}) => {
    if (!confirm) {
      return Promise.reject()
    }
  })
}
