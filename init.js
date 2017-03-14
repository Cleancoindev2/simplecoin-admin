/// init.js -- global variables, generic initialization logic

let views = {} // Holds view components (named by `<div data-view=foo>')
let redraw = $ => async.each(all("[data-view]"), (node, $) => {
  render(tag(views[node.dataset.view], state), node, $)
}, $)

// Show elements tagged `data-when=foo' only when `state.phase == "foo"':
for (let phase of uniq(map(all("[data-when]"), x => x.dataset.when))) {
  style(`[data-phase=${phase}] [data-when=${phase}] { display: block; }`)
}

let chain = {} // Holds contract classes and instances (from dapple)
let web3 = new Web3(this.web3 ? this.web3.currentProvider : (
  new Web3.providers.HttpProvider("http://localhost:8545")
))

let state = State({}) // Holds both persistent and runtime state
let update = (x, $) => (assign(state, x), redraw($))
let persist = (x, $) => (assign(storage, convert(x, json)), update(x, $))
let reload = $ => parallel(fetch, hopefully(x => update(x, $)))

function init() {
  // Load persistent state (from local storage)
  assign(state, convert(storage, unjson))
  // Determine network version (in order to infer `chain.env')
  console.log("Inferring blockchain environment...")
  web3.version.getNetwork(timeout(300, () => {
    // Show `loading' message after a few hundred milliseconds
    state.phase = "loading"
  }, (error, network) => {
    if (error) {
      state.phase = "failed"
    } else {
      // Proceed to initialize the application
      if (network == 42) {
        chain.env = "kovan";
      } else {
        if (network > 4) { network = 5; }
        chain.env = [, "live", "morden", "ropsten", "kovan", "develop"][network]
      }
      // Initiate contracts
      chain.SimplecoinFactory = web3.eth.contract(abi.factory).at(factoryConfig[chain.env]);
      chain.Simplecoin = web3.eth.contract(abi.coin)
      chain.SimpleRoleAuth = web3.eth.contract(abi.role)

      console.log(`Environment: ${chain.env}`)
      reload(() => update({ phase: "loaded" }))
    }
  }))
}

function timeout(ms, callback, $) {
  let x = setTimeout(callback, ms)
  return (...rest) => (clearTimeout(x), $(...rest))
}

function State(x) {
  return assign(define({}, {
    phase: {
      get: () => body.dataset.phase,
      set: x => body.dataset.phase = x,
    },
    quiet: {
      get: () => body.classList.contains("quiet"),
      set: x => body.classList.toggle("quiet", x),
    },
  }), x)
}
