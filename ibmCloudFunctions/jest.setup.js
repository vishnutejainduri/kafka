// https://stackoverflow.com/a/49591765/12484139
global.console = {
  ...global.console,
  log: jest.fn(), // console.log are ignored in tests
  error: jest.fn()
}
