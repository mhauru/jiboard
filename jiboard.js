'use strict';
const starttime = Date.now(); // DEBUG
// TODO I would like to ES6 module import also SVG.js and rxjs, and locally
// import ResizeObserver from a module folder rather than a .min.js I manually
// copied from a CDN. None of these things seem possible because the
// javascript module ecosystem is a massive mess that drives me nuts.
import './node_modules/tone/build/Tone.js';
import {readURL, setupStreams} from './streams.js';
import {toneToString, toneToFraction, primeDecompose, ToneObject} from './toneobject.js';
import {EDOTones} from './edo.js';
import {EDOKey} from './edokey.js';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Global constants.

// TODO This is duplicated here and in toneobject.js. Fix.
const ALLPRIMES = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
  73, 79, 83, 89, 97,
];

const synth = new Tone.PolySynth(10, Tone.Synth, {
  oscillator: {
    type: 'sine',
    // Relative amplitudes of overtones.
    partials: [1, 0.3, 0.2],
  },
}).toMaster();

function addEDOKeys() {
  EDOTones.forEach((EDOTone) => {
    new EDOKey(
      EDOTone.frequency,
      EDOTone.keytype,
      scaleFig.keyCanvas,
      streams,
      synth
    );
  });
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Read the URL for parameter values to start with, and define a function for
// writing the URL.

// Hard-coded defaults.
const DEFAULT_URLPARAMS = new Map();
DEFAULT_URLPARAMS.set('originFreq', 261.626);
DEFAULT_URLPARAMS.set('maxHarmNorm', 8.0);
DEFAULT_URLPARAMS.set('pitchlineColor', '#c7c7c7');
DEFAULT_URLPARAMS.set('pitchlineColorActive', '#000000');
DEFAULT_URLPARAMS.set('showPitchlines', true);
DEFAULT_URLPARAMS.set('showKeys', true);
DEFAULT_URLPARAMS.set('showSteps', false);
DEFAULT_URLPARAMS.set('toneRadius', 22.0);
DEFAULT_URLPARAMS.set('toneLabelTextStyle', 'fractions');
DEFAULT_URLPARAMS.set('toneColor', '#D82A1E');
DEFAULT_URLPARAMS.set('toneColorActive', '#D8B71E');
DEFAULT_URLPARAMS.set('baseToneBorderColor', '#000000');
DEFAULT_URLPARAMS.set('baseToneBorderSize', 5.0);
DEFAULT_URLPARAMS.set('minToneOpacity', 0.15);
DEFAULT_URLPARAMS.set('horizontalZoom', 300.0);
DEFAULT_URLPARAMS.set('verticalZoom', 100.0);
DEFAULT_URLPARAMS.set('midCoords', [0.0, 0.0]);
DEFAULT_URLPARAMS.set('baseTones', new Map([['', new Map()]]));
DEFAULT_URLPARAMS.set('settingsExpanded', true);
DEFAULT_URLPARAMS.set('generalExpanded', true);
DEFAULT_URLPARAMS.set('tonesExpanded', false);
DEFAULT_URLPARAMS.set('styleExpanded', false);
DEFAULT_URLPARAMS.set('primes', [2, 3, 5]);
DEFAULT_URLPARAMS.set('yShifts', new Map([[2, 1.2], [3, 1.8], [5, 1.0]]));
DEFAULT_URLPARAMS.set('harmDistSteps', new Map([[2, 0.0], [3, 1.5], [5, 1.7]]));

// scaleFig is a global object that essentially functions as a namespace.
// Its fields are various global variables related to the SVG canvasses.
const scaleFig = {};

// Set up the SVG canvases.
scaleFig.canvas = new SVG('divCanvas');
scaleFig.keyCanvas = new SVG('divKeyCanvas');
scaleFig.keyCanvas.attr('preserveAspectRatio', 'none');
// Note that the order in which we create these groups sets their draw order,
// i.e. z-index.
scaleFig.svgGroups = {
  'pitchlines': scaleFig.canvas.group(),
  'tones': scaleFig.canvas.group(),
};

// A global constant that holds the values of various parameters at the very
// start.  These values will be either hard-coded default values, or values
// read from the URL query string.
const startingParams = readURL(DEFAULT_URLPARAMS);

// streams is a global object that works as a namespace for all globally
// available streams.
const streams = setupStreams(startingParams, DEFAULT_URLPARAMS, scaleFig);

// TODO What's the right place to have this bit?
const allTones = new Map();
streams.baseTones.subscribe((baseTones) => {
  // We only have to care about creating new Tones here. Each tone object
  // subscribes to baseTones to check if its own isBase should change.
  baseTones.forEach((bt, btStr) => {
    if (!allTones.has(btStr)) {
      new ToneObject(bt, true, scaleFig.svgGroups, streams, allTones, synth);
    }
  });
});

// TODO Which file do addAxis and removeAxis go in?
// Associate each prime to each it's streams, to make it possible to remove the
// right ones with removeSource.
const yShiftStreams = new Map();
const harmDistStepStreams = new Map();

// TODO add/remove axis/basetone all access the global streams object. That's
// probably not good, but more generally, I'm not sure where these functions
// should be defined in the first place.
function addAxis(
  startingYyshift = 0.0,
  startingHarmStep = streams.maxHarmNorm.getValue()
) {
  const prime = ALLPRIMES[streams.primes.getValue().length];

  const inNumYshift = document.createElement('input');
  inNumYshift.id = `inNumYshift_${prime}`;
  inNumYshift.type = 'number';
  inNumYshift.min = -10;
  inNumYshift.max = 10;
  inNumYshift.step = 0.01;
  inNumYshift.style.width = '80px';

  const inRangeYshift = document.createElement('input');
  inRangeYshift.id = `inRangeYshift_${prime}`;
  inRangeYshift.type = 'range';
  inRangeYshift.step = 0.01;
  inRangeYshift.max = 10.0;
  inRangeYshift.min = -10.0;

  const inNumHarmdiststep = document.createElement('input');
  inNumHarmdiststep.id = `inNumHarmdiststep_${prime}`;
  inNumHarmdiststep.type = 'number';
  inNumHarmdiststep.min = -20;
  inNumHarmdiststep.max = 20;
  inNumHarmdiststep.step = 0.01;
  inNumHarmdiststep.style.width = '80px';

  const inRangeHarmdiststep = document.createElement('input');
  inRangeHarmdiststep.id = `inRangeHarmdiststep_${prime}`;
  inRangeHarmdiststep.type = 'range';
  inRangeHarmdiststep.step = 0.01;
  inRangeHarmdiststep.max = 10.0;
  inRangeHarmdiststep.min = 0.0;

  const parYShift = document.createElement('p');
  parYShift.innerHTML = 'y-shift: ';
  parYShift.appendChild(inNumYshift);
  parYShift.appendChild(inRangeYshift);

  const parHarmDistStep = document.createElement('p');
  parHarmDistStep.innerHTML = 'Harmonic distance: ';
  parHarmDistStep.appendChild(inNumHarmdiststep);
  parHarmDistStep.appendChild(inRangeHarmdiststep);

  const divAxis = document.createElement('div');
  divAxis.id = `divAxis_${prime}`;
  divAxis.innerHTML = `Axis: ${prime}`;
  divAxis.appendChild(parYShift);
  divAxis.appendChild(parHarmDistStep);

  document.getElementById('contentAxes').appendChild(divAxis);

  const yShiftStream = new rxjs.BehaviorSubject(
    new Map([[prime, startingYyshift]])
  );
  rxjs.merge(
    rxjs.fromEvent(inNumYshift, 'input'),
    rxjs.fromEvent(inRangeYshift, 'input'),
  ).pipe(
    rxjs.operators.pluck('target', 'value'),
    rxjs.operators.map((value) => {
      return new Map([[prime, value]]);
    }),
  ).subscribe(yShiftStream);
  yShiftStream.subscribe((m) => {
    const value = m.get(prime);
    inNumYshift.value = value;
    // TODO This used be value.toString(). Why?
    inRangeYshift.value = value;
  });

  const harmStepStream = new rxjs.BehaviorSubject(
    new Map([[prime, startingHarmStep]])
  );
  rxjs.merge(
    rxjs.fromEvent(inNumHarmdiststep, 'input'),
    rxjs.fromEvent(inRangeHarmdiststep, 'input'),
  ).pipe(
    rxjs.operators.pluck('target', 'value'),
    rxjs.operators.map((value) => {
      return new Map([[prime, value]]);
    }),
  ).subscribe(harmStepStream);
  harmStepStream.subscribe((m) => {
    const value = m.get(prime);
    inNumHarmdiststep.value = value;
    // TODO This used be value.toString(). Why?
    inRangeHarmdiststep.value = value;
  });

  streams.harmDistSteps.addSource(harmStepStream);
  streams.yShifts.addSource(yShiftStream);
  const primes = streams.primes.getValue();
  primes.push(prime);
  streams.primes.next(primes);
  yShiftStreams.set(prime, yShiftStream);
  harmDistStepStreams.set(prime, harmStepStream);
}

function removeAxis() {
  const primes = streams.primes.getValue();
  const prime = primes.pop();
  const divAxis = document.getElementById(`divAxis_${prime}`);
  document.getElementById('contentAxes').removeChild(divAxis);
  const yShiftStream = yShiftStreams.get(prime);
  const harmStepStream = harmDistStepStreams.get(prime);
  streams.yShifts.removeSource(yShiftStream);
  streams.harmDistSteps.removeSource(harmStepStream);
  yShiftStreams.delete(prime);
  harmDistStepStreams.delete(prime);
  streams.primes.next(primes);

  // TODO This used to have a bit that went through baseTones, and removed all
  // the ones that had a component along this axis. Should we have something
  // similar now?
}

const buttAddAxis = document.getElementById('buttAddAxis');
buttAddAxis.onclick = function buttAddAxisOnclick() {
  addAxis();
}

const buttRemoveAxis = document.getElementById('buttRemoveAxis');
buttRemoveAxis.onclick = function buttRemoveAxisOnclick() {
  removeAxis();
};

function addBaseTone(tone = null) {
  let bt;
  let num;
  let denom;
  if (tone == null) {
    const inNumerator = document.getElementById('inNewBaseToneNumerator');
    const inDenominator = document.getElementById('inNewBaseToneDenominator');
    num = inNumerator.valueAsNumber;
    denom = inDenominator.valueAsNumber;
    bt = primeDecompose(num, denom);
  } else {
    bt = tone;
    [num, denom] = toneToFraction(bt);
  }

  if (denom == 0 || !Number.isInteger(denom) || !Number.isInteger(num)) {
    // TODO Create some kind of pop-up warning.
    console.log(`Invalid base tone: ${num} / ${denom}`);
    return false;
  }

  const btStr = toneToString(bt);
  const currentBts = streams.baseTones.getValue();
  if (currentBts.has(btStr)) {
    // TODO Create some kind of pop-up warning.
    console.log(`Base tone already exists: ${num} / ${denom}`);
    return false;
  }

  currentBts.set(btStr, bt);
  streams.baseTones.next(currentBts);

  const par = document.createElement('p');
  const label = document.createElement('span');
  label.innerHTML = `${num} / ${denom}`;
  const butt = document.createElement('button');
  butt.innerHTML = 'X';

  par.appendChild(label);
  par.appendChild(butt);

  document.getElementById('contentBaseTones').appendChild(par);

  butt.onclick = function remove() {
    const currentBts = streams.baseTones.getValue();
    document.getElementById('contentBaseTones').removeChild(par);
    currentBts.delete(btStr);
    streams.baseTones.next(currentBts);
  };
}

const buttAddBaseTone = document.getElementById('buttAddBaseTone');
buttAddBaseTone.onclick = () => {
  addBaseTone();
};

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/*
function checkTones() {
  // Some consistency checks, for testing purposes.
  const svgTones = [];
  const svgPitchlines = [];
  const svgSteps = [];

  Object.entries(scaleFig.tones).forEach(([coords, tone]) => {
    const inbounds = tone.inbounds;
    const inclosure = tone.inclosure;
    const isboundary = coords in scaleFig.boundaryTones;
    svgTones.push(tone.svgTone);
    svgPitchlines.push(tone.svgPitchline);

    if (inbounds && !inclosure) {
      const msg = `Error: tone ${coords} is inbounds but not inclosure.`;
      console.log(msg);
    }

    // TODO Some kind of check of the fact that inbounds and inclosure should
    // match when viewbox is large enough.

    if (!inclosure && !isboundary) {
      const msg = `Error: tone ${coords} is not inclosure, but also is not \
boundary.`;
      console.log(msg);
    }

    Object.entries(tone.incomingSteps).forEach(([label, step]) => {
      const isEndpoint = step.endpoint == tone;
      if (!isEndpoint) {
        const msg = `Error: tone ${endpoint} claims to be the endpoint of step\
 ${step} , but isn't actually.`;
        console.log(msg);
      }
    });

    Object.entries(tone.steps).forEach(([label, step]) => {
      const svgStep = step.svgStep;
      svgSteps.push(svgStep);
      if (step.hasEndpoint) {
        const endpoint = step.endpoint;
        const endpointKnows = endpoint.incomingSteps[label] === step;
        if (!endpointKnows) {
          const msg = `Error: tone ${endpoint} is the endpoint of step ${step}\
 , but doesn't know it.`;
          console.log(msg);
        }

        const interval = scaleFig.stepIntervals[label].interval;
        const endpointCoords = sumTones(tone.coords, interval);
        if (!tonesEqual(endpointCoords, endpoint.coords)) {
          const msg = `Error: tone ${endpoint} is the endpoint of step ${step}\
 , but the correct endpoint is at ${endpointCoords}.`;
          console.log(msg);
        }
      } else {
        const interval = scaleFig.stepIntervals[label].interval;
        const endpointCoords = sumTones(tone.coords, interval);
        const endpointExists = endpointCoords in scaleFig.tones;
        if (endpointExists) {
          const msg = `Error: tone at ${endpointCoords} should be the endpoint 
\of a step from ${step.origin.coords}, but no endpoint has been set.`;
          console.log(msg);
        }
      }

      const stepInterval = scaleFig.stepIntervals[step.label];
      const svgInGroup = stepInterval.svgGroup.has(svgStep);
      if (!svgInGroup) {
        const msg = `Error: svgStep ${svgStep.id()} is not in the step group.`;
        console.log(msg);
      }
    });

    Object.entries(scaleFig.stepIntervals).forEach(([label, stepInterval]) => {
      const hasStep = label in tone.steps;
      if (!hasStep) {
        const msg = `Error: tone ${tone} does not have a step ${label}.`;
        console.log(msg);
      }
    });
  });

  Object.entries(scaleFig.boundaryTones).forEach(([coords, tone]) => {
    const inclosure = tone.inclosure;
    const intones = coords in scaleFig.tones;

    if (!intones) {
      const msg = `Error: tone ${coords} is in boundaryTones, but not in \
tones.`;
      console.log(msg);
    }

    if (inclosure) {
      const msg = `Error: tone ${coords} is boundary, but also inclosure.`;
      console.log(msg);
    }
  });

  svgTones.forEach((svgTone) => {
    const inGroup = scaleFig.svgGroups.tones.has(svgTone);
    if (!inGroup) {
      const msg = `Error: svgTone ${svgTone.id()} is not in the tone group.`;
      console.log(msg);
    }
  });

  svgPitchlines.forEach((svgPitchline) => {
    const inGroup = scaleFig.svgGroups.pitchlines.has(svgPitchline);
    if (!inGroup) {
      const msg = `Error: svgPitchline ${svgPitchline.id()} is not in the \
pitchline group.`;
      console.log(msg);
    }
  });

  scaleFig.svgGroups.pitchlines.children().forEach((svgPitchline) => {
    const hasParent = svgPitchlines.includes(svgPitchline);
    if (!hasParent) {
      const msg = `Error: svgPitchline ${svgPitchline.id()} is not the \
pitchline of any tone.`;
      console.log(msg);
    }
  });

  scaleFig.svgGroups.tones.children().forEach((svgTone) => {
    const hasParent = svgTones.includes(svgTone);
    if (!hasParent) {
      const msg = `Error: svgTone ${svgTone.id()} is not the \
tone of any tone.`;
      console.log(msg);
    }
  });
}

checkTones(); // TODO Only here for testing during development.
*/

addEDOKeys();

for (const p of startingParams['primes']) {
  const yShift = startingParams['yShifts'].get(p);
  const hds = startingParams['harmDistSteps'].get(p);
  addAxis(yShift, hds);
}

startingParams['baseTones'].forEach((bt) => {
  addBaseTone(bt);
});

const endtime = Date.now(); // DEBUG
console.log('Seconds till the end of script:', (endtime - starttime)/1000.0); // DEBUG
