/* eslint-disable no-not-accumulator-reassign/no-not-accumulator-reassign */
const path = require('path')
const webpack = require('webpack')
const WebpackShellPlugin = require('@skpm/builder/lib/utils/webpackCommandPlugin/webpackShellPlugin')
const { CLEAR } = require('./constants')
const findLoader = require('./loader-hacks/find-loader')

const SUPPORTED_LOADERS = ['babel-loader', 'awesome-typescript-loader']

module.exports = (skpmConfig, testFiles, argv) => config => {
  config.output.filename = 'compiled-tests.js'
  config.output.path = path.resolve(
    __dirname,
    '../../test-runner.sketchplugin/Contents/Sketch'
  )
  // https://webpack.js.org/configuration/output/#output-devtoolmodulefilenametemplate
  config.output.devtoolModuleFilenameTemplate = '[absolute-resource-path]'

  config.plugins.push(
    new webpack.ProvidePlugin({
      expect: require.resolve('../../expect'),
    })
  )

  if (!argv.buildOnly) {
    config.plugins.push(
      // eslint-disable-next-line
      new WebpackShellPlugin.default({
        script: WebpackShellPlugin.sketchtoolRunCommand(
          path.resolve(__dirname, '../../test-runner.sketchplugin'),
          'plugin-tests',
          {
            app: argv.app,
            withoutActivating: true,
            handleError: false,
            pre:
              argv.watch && require('./is-interactive')
                ? `printf "${CLEAR}" &&`
                : '',
            post: `| node "${path.join(
              __dirname,
              './report-test-results.js'
            )}" --testFiles=${testFiles.length}${argv.watch ? ' --watch' : ''}`,
          }
        ),
      })
    )
  }

  let hacked = false

  for (let i = 0; i < SUPPORTED_LOADERS.length; i += 1) {
    const loader = findLoader(config, SUPPORTED_LOADERS[i])

    if (loader) {
      require(`./loader-hacks/${SUPPORTED_LOADERS[i]}.hack`)(skpmConfig, loader)
      hacked = true
      break
    }
  }

  if (!hacked) {
    throw new Error(
      'Not sure how to handle your loader. Please open an issue on https://github.com/skpm/skpm'
    )
  }

  config.devtool = 'source-map'

  return config
}
