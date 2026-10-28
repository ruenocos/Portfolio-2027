import { about } from "./about";
import { home } from "./home";
import { playgroundPiece } from "./playground";
import { project } from "./project";

// One document per page (Home, About), one per project (its row and its
// case page), one per Playground post.
export const schemaTypes = [home, about, project, playgroundPiece];

export const singletonTypes = new Set(["home", "about"]);
