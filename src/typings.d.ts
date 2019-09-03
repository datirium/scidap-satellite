/// <reference types="zone.js" />
/// <reference types="@types/meteor" />
/// <reference types="@types/node" />

/* tslint:disable */

/* SystemJS module definition */
declare var nodeModule: NodeModule;
interface NodeModule {
  id: string;
}

declare var window: Window;
interface Window {
  process: any;
  require: any;
}
