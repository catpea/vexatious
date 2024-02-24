export class Inheritance {
  chain = [];
  #client;

  constructor(client){
    this.#client = client;
    this.initialize(client);
  }

  initialize(client){
    this.#client.className = this.#client.constructor.name;
    this.chain.push(client);
    this.extendObject();
  }

  extendObject(){
    if (this.#client.extends && Array.isArray(this.#client.extends)){
      for (const TypeClass of this.#client.extends) {
        const typeInstance = new TypeClass();
        this.chain.push(typeInstance, ...typeInstance.oop.cchain);
      }
    }
  }

}

export class Instance {

  constructor(TypeClass){

    const typeInstance = new TypeClass();



    // Install Properties
    for (const inherited of typeInstance.inheritance.chain) {
      // begin at top, avoid properties that already exist.
      if(inherited.properties){
        for (const [propertyName, propertyValue] of Object.entries(inherited.properties)) {
          if(propertyName in this === false){
            Object.defineProperty(this, propertyName, {
              value: propertyValue,
              writable: true,
              enumerable: true,
              configurable: false,
            });
          }
        } // for properties
      } // if
    }

    // Install Traits
    for (const inherited of typeInstance.inheritance.chain) {
      // begin at top, avoid properties that already exist.
      if(inherited.traits){
        for (const [traitName, traitFunction] of Object.entries(inherited.traits)) {
          if(traitName in this === false){
            Object.defineProperty(this, traitName, {
              value: traitFunction.bind(this),
              writable: true,
              enumerable: true,
              configurable: false,
            });
          }
        } // for properties
      } // if
    }

    // Install Methods
    for (const inherited of typeInstance.inheritance.chain) {
      // begin at top, avoid properties that already exist.
      if(inherited.methods){
        for (const [methodName, methodFunction] of Object.entries(inherited.methods)) {
          if(methodName in this === false){
            Object.defineProperty(this, methodName, {
              value: methodFunction===true?inherited[methodName].bind(inherited):methodFunction.bind(inherited),
              writable: true,
              enumerable: true,
              configurable: false,
            });
          }
        } // for properties
      } // if
    }

    const observableData = {};
    // Install Observables
    for (const inherited of typeInstance.inheritance.chain) {
      // begin at top, avoid properties that already exist.
      if(inherited.observables){
        for (const [observableName, observableValue] of Object.entries(inherited.observables)) {
          const isArray = Array.isArray(observableValue)?true:false;
          if(observableName in this === false){

            if(isArray){
              observableData[observableName] = new List(observableName, observableValue);
              Object.defineProperty(this, observableName, {
                get: () => observableData[observableName].value,
                set: (value) => {throw new Error(`observable array ${name} cannot be replaced`)},
                configurable: false,
              });
            }else{ // primitive
              observableData[observableName] = new Primitive(observableName, observableValue);
              Object.defineProperty(this, observableName, {
                get: () => observableData[observableName].value,
                set: (value) => observableData[observableName].value = value,
                configurable: false,
              });
            }

          }
        } // for properties
      } // if
    }

    // Install Constraints
    for (const inherited of typeInstance.inheritance.chain) {
      if(inherited.constraints){
        for (const [constraintName, constraintValue] of Object.entries(inherited.constraints)) {
          if(!observableData[constraintName]) throw new Error("Unable to constraint a property that is not defined");
          for (const [message, test] of Object.entries(constraintValue)) {
            observableData[constraintName].constraints.push({message, test:test.bind(this)});
            observableData[constraintName].constrain(observableData[constraintName].value);
          }
        } // for constraints
      } // if constraints
    }

    // Install Cleaning System, to enable tracking observers
    const disposables = [];
    const disposable = function (...arg){
      disposables.push(...arg);
    }
    this.dispose = function(){
      disposables.map(f=>f());
    }

    // Enable Observing
    this.on = function(eventPath, observerCallback, options){
      const [name, path] = eventPath.split('.', 2);
      if(!observableData[name]) throw new Error(`property "${name}" not defined (${Object.keys(observableData).join(', ')})`);
      disposable( observableData[name].observe(path||name, observerCallback, options) );
    }

    if(typeInstance.initialize){
      typeInstance.initialize.bind(this)();
    }

  }

}

export class Primitive {
  name = null;
  #value = null;

  constraints = [];

  constructor(name, value) {
    this.name = name;
    this.#value = value;
  }

  constrain(data) {
    this.constraints.forEach(({ test, message }) => {
      const verdict = test(data, this.#value);
      if (verdict?.error) {
        throw new Error(`🍔 constraint error: ${message} - ${verdict.error} (attempted to set ${this.name} to ${data})`);
      }
    });
  }

  // Getter And Setter

  get value() {
    return this.#value;
  }

  set value(data) {
    console.log(`Setting ${this.name} to "${data}" was: `, this.#value);
    if (this.#value == data) return;
    this.constrain(data);
    const previousValue = this.#value;
    this.notify(`${this.name}.before`, this.#value, previousValue);
    this.#value = data;
    this.notify(this.name, this.#value, previousValue);

  }


  // Install Observer Functionality

  #observers = {};
  observe(eventName, observerCallback, options = { autorun: true }) {
    if (typeof observerCallback !== "function") throw new TypeError("observer must be a function.");
    if (!Array.isArray(this.#observers[eventName])) this.#observers[eventName] = []; // If there isn't an observers array for this key yet, create it
    this.#observers[eventName].push(observerCallback);
    // console.log(`this.#observers.${eventName}`, this.#observers[eventName]);
    if (options.autorun) observerCallback(this.#value); // NOTE: only returns data if it is a property, otherwise it will be undefined
    return () => {
      this.unobserve(eventName, observerCallback);
    };
  }
  unobserve(eventName, observerCallback) {
    this.#observers[eventName] = this.#observers[eventName].filter((obs) => obs !== observerCallback);
  }

  notify(eventName, eventData, ...extra) {
    if (Array.isArray(this.#observers[eventName])){
      // console.log(`Event ${eventName} has ${this.#observers[eventName].length} observer(s)`);
      this.#observers[eventName].forEach((observerCallback) => observerCallback(eventData, ...extra));
    }else{
      // console.log(`${eventName} has no observers`);
    }
  }
  status(){

    return {
      observerCount: Object.values(this.#observers).flat().length,
    }
  }
}

export class List {
  name = null;
  #value = [];

  constraints = [];

  constructor(name, value) {
    this.name = name;
    this.#value.push(...value);
    this.constrain();
  }

  constrain() {
    for (const data of this.#value) {
      this.constraints.forEach(({ test, message }) => {
        const verdict = test(data, this.#value);
        if (verdict?.error) {
          throw new Error(`🍔 constraint error: ${message} - ${verdict.error} (attempted to set ${this.name} to ${data})`);
        }
      });
    }
  }


  get value() {
    return this; // NOTE: returning PropertyList as it is the array that wraps the simple array
  }




  // Install Observer Functionality

  #observers = {};
  observe(eventName, observerCallback, options = { autorun: true, replay: false }) {

    if (typeof observerCallback !== "function") throw new TypeError("observer must be a function.");
    if (!Array.isArray(this.#observers[eventName])) this.#observers[eventName] = []; // If there isn't an observers array for this key yet, create it

    // AUTORUN LOGIC
    if(options.autorun){
      if( eventName == this.name ){ // will not spew for xxx.created or xxx.deleted just xxx
        for (const item of this.#value) { observerCallback(item) }
      }
    }

    // REPLAY, applies to all events (autorun only applies to non-dot events)
    // if .created needs a feed to initialize
    if( options.replay ){
      for (const item of this.#value) { observerCallback(item) }
    }

    this.#observers[eventName].push(observerCallback);
    return () => {
      this.unobserve(eventName, observerCallback);
    };
  }

  unobserve(eventName, observerCallback) {
    this.#observers[eventName] = this.#observers[eventName].filter((obs) => obs !== observerCallback);
  }

  notify(eventName, eventData, ...extra) {
    if (Array.isArray(this.#observers[eventName])) this.#observers[eventName].forEach((observerCallback) => observerCallback(eventData, ...extra));
  }
  status(){
    return {
      observerCount: Object.values(this.#observers).flat().length,

    };
  }




  // Data Editing Functions

  create(...items) {

    for(const item of items) {
      this.constrain(item);
      // if(!((Container.prototype.isPrototypeOf(item)) || (Control.prototype.isPrototypeOf(item)))) throw new Error(`Must be a Container or Control.`);
      this.#value.push(item);
      this.notify("created", item);
      this.notify("changed", this);
    }
  }

  remove(item){
    this.#value = this.#value.filter(o => o.id !== item.id);
    this.notify("removed", item);
    this.notify("changed", this);
  }


  // Data Reading Functions



  	[Symbol.iterator]() {
  		return this.#value[Symbol.iterator]();
  	}
  	find(callback) {
  		if(typeof callback !== "function") throw new TypeError("Needs a function.");
  		return this.#value.find(callback);
  	}
  	map(callback) {
  		if(typeof callback !== "function") throw new TypeError("Needs a function.");
  		return this.#value.map(callback);
  	}
  	reduce(callback, initialValue) {
  		if(typeof callback !== "function") throw new TypeError("Needs a function.");
  		return this.#value.reduce(callback, initialValue);
  	}
  	filter(callback) {
  		if(typeof callback !== "function") throw new TypeError("Needs a function.");
  		return this.#value.filter(callback);
  	}
  	forEach(callback) {
  		if(typeof callback !== "function") throw new TypeError("Needs a function.");
  		return this.#value.forEach(callback);
  	}
  	indexOf(item) {
  		return this.#value.indexOf(item);
  	}
  	slice(...argv) {
  		return this.#value.slice(...argv);
  	}

  	get length(){
  		return this.#value.length
  	}
  	get raw(){
  		return this.#value;
  	}


}
