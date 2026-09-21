import { Home, Main, Events } from './overview.js';
import { Survey, Trends, Sparks, Digest } from './lit.js';
import { Ideas, Panorama, GraphScreen, Tree } from './hyp.js';
import { Experiments, ExpTree, Sweep, Runs } from './exp.js';
import { Review, Paper, Claims, Figures, Rebuttal } from './write.js';

export const SCREENS = {
  home: Home, main: Main, events: Events,
  survey: Survey, trends: Trends, sparks: Sparks, digest: Digest,
  ideas: Ideas, panorama: Panorama, graph: GraphScreen, tree: Tree,
  experiments: Experiments, exptree: ExpTree, sweep: Sweep, runs: Runs,
  review: Review, paper: Paper, claims: Claims, figures: Figures, rebuttal: Rebuttal,
};
