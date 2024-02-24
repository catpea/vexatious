OOP Done Right

oop

## Step 1

```JavaScript

import {Inheritance} from "#plug-ins/object-oriented-programming/index.js";

export default class Themes {

  extends = [];

  properties = {}; // non observable
  methods = {}; bound to original class object

  traits = {}; bound to instantiated this
  observables = {}; // have .on, .on('x.before')
  constraints = {}; // return object with error property holding error message

  initialize(){ // initialize the instance

    this.on('xxx.before', id => {
    });

    this.on('xxx', (id, old) => {
    });

  }


  constructor(){
    this.inheritance = new Inheritance(this); // bootstrap
  }

}

```







## Snippets

```JavaScript

// import ReactiveObject from '#plug-ins/reactive-object/ReactiveObject.js';
// import Properties from "#plug-ins/properties/Properties.js";
import {Inheritance} from "#plug-ins/object-oriented-programming/index.js";

import Theme from "#abstract/Theme.js";
import Nostromo from "#plug-ins/nostromo-theme/index.js";
import Obsidian from "#plug-ins/obsidian-theme/index.js";

export default class Themes {

  extends = [];

  observables = {
    theme: "obsidian",
    themes: [new Nostromo({ subtle: true }), new Obsidian({ subtle: true })],
  };

  constraints = {
    theme: {
      'all themes are lower-case': function(theme){
        if( theme.match(/[A-Z]/) ){
          return {error:'theme name contains uppercase letters'};
        }
      },
      'specified theme does not exist': function(theme){
        if(!this.themes.map((o) => o.id).includes(theme)) return {error:'theme does not exist'};
      },
    },
    themes: {
      'theme is not a prototype of #abstract/Theme': function(v){
        if(! Theme.prototype.isPrototypeOf(v) ) return {error:'must extend Theme'};
      }
    }
  };

  constructor(){
    this.inheritance = new Inheritance(this);
  }

  initialize(){

    this.on('theme.before', id => {
      // console.info('About To Change Theme To', id);
    });

    this.on('theme', (id, old) => {
      // console.info(`Theme Change from ${old} to ${id}`);
      document.querySelector("html").dataset.uiTheme = id;
      // console.info("dataset.uiTheme", document.querySelector("html").dataset);
    });

    this.on("themes.created", (list) => {p
      // console.log("themes created", { list });
    });

    this.on("themes.removed", (list) => {
      // console.log("themes removed", { list });
    });

    // way to listen to an array
    this.on("themes.changed", (list) => {
      // console.log("themes changed", { list });
    });

  }

}

```
