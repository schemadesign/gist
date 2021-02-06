const Translate = require('@google-cloud/translate')
const languages = require('../languages.json')
const strings = require('../instances.strings.json')

// Your Google Cloud Platform project ID
const projectId = process.env['GOOGLE_CLOUD_PROJECT_ID']

const translate = new Translate({
  projectId: projectId
})

const getTargetLanguageTranslations = text => languageResponse =>
  Promise.all(
    languages.map(({ language, code }) =>
      translate
        .translate(text, code)
        .then(results => ({ code, language, text: results[0] }))
    )
  )

const column = text => text.trim().split('\n')
const outputLanguageCSV = translations => {
  const english = column(text)
  const columns = translations.map(({ language, translation }) =>
    [language].concat(column(translation))
  )
  columns[0].forEach((o, i) => {
    console.log(columns.map(column => column[i]).join('\t'))
  })
}

const getStringsObject = translations =>
  translations.reduce(
    (combined, { code, text }) => ({
      ...combined,
      [code]: text.split('\n').map(text => text.replace(/<z([\w_]+)z ?\/>/gi, (match, ...groups) => `#{${groups[0].toLowerCase()}}`))
    }),
    {}
  )

const text = strings.en.join('\n')

translate
  .getLanguages()
  .then(getTargetLanguageTranslations(text))
  // .then(outputLanguageCSV)
  .then(getStringsObject)
  // Output a translation object.
  .then(str => console.log(JSON.stringify(str, null, 2)))
  .catch(e => console.log(e))
