// import { Meteor } from 'meteor/meteor';

import { Observable, Subscriber } from 'rxjs';

export const isFunction = value => value && (Object.prototype.toString.call(value) === '[object Function]' ||
    'function' === typeof value || value instanceof Function);

export class MeteorObservable {

    public static subscribeAutorun<T>(name: string, ...args: any[]): Observable<T> {
        const lastParam = args[args.length - 1];

        if (!isFunction(lastParam)) {
            console.log('last param has to be a function');
            return;
        }
        const _args = args.slice(0, args.length - 1);


        return Observable.create((observer: Subscriber<Meteor.Error | T>) => {
            let autoHandler = null;
            const subHandler = Meteor.subscribe(name, ..._args.concat([{
                onError: (error: Meteor.Error) => {
                    observer.error(error);
                },
                onReady: () => {
                    autoHandler = Tracker.autorun((computation: Tracker.Computation) => {
                        const _trk = lastParam(subHandler, computation); /// has to be here to be trackted !!!
                        Tracker.nonreactive(() => observer.next(_trk));
                        // observer.next(lastParam(computation));
                    });
                },
                onStop: () => {
                    if (autoHandler) {
                        autoHandler.stop();
                    }
                }
            }
            ]));
            return () => subHandler.stop();
        });
    }

    /**
     * Invokes a [Meteor Method](https://docs.meteor.com/api/methods.html)
     * defined on the server, passing any number of arguments. This method has
     * the same signature as
     * [Meteor.call](https://docs.meteor.com/api/methods.html#Meteor-call), only
     * without the callbacks:
     *    MeteorObservable.call(name, [...args])
     *
     *
     *  @param {string} name - Name of the method in the Meteor server
     *  @param {any} args - Parameters that will be forwarded to the method.
     *   after the func call to initiate change detection.
     *  @returns {Observable<T>} - RxJS Observable, which completes when the
     *  server returns a response.
     *
     *  @example <caption>Example using Angular2 Component</caption>
     *  class MyComponent  {
   *     constructor() {
   *
   *     }
   *
   *     doAction(payload) {
   *        MeteorObservable.call("myData", payload).subscribe((response) => {
   *           // Handle success and response from server!
   *        }, (err) => {
   *          // Handle error
   *        });
   *     }
   *  }
     */
    public static call<T>(name: string, ...args: any[]): Observable<T> {
        const lastParam = args[args.length - 1];

        if (isMeteorCallbacks(lastParam)) {
            throw Error('MeteorObservable.call');
        }

        return Observable.create((observer: Subscriber<Meteor.Error | T>) => {
            Meteor.call(name, ...args.concat([
                (error: Meteor.Error, result: T) => {
                    error ? observer.error(error) : observer.next(result);
                    observer.complete();
                }
            ]));
        });
    }

    public static apply<T>(name: string, args: EJSONable[], options?: {
        wait?: boolean;
        onResultReceived?: Function;
    }|any): Observable<T> {

        return Observable.create((observer: Subscriber<Meteor.Error | T>) => {
            Meteor.apply(name, args, options,
                (error: Meteor.Error, result: T) => {
                    error ? observer.error(error) : observer.next(result);
                    observer.complete();
                });
        });
    }
}



////// HELPER FUNCTIONS
export interface CallbacksObject {
    onReady?: Function;
    onError?: Function;
    onStop?: Function;
}

export declare type MeteorCallbacks = ((...args) => any) | CallbacksObject;

export const subscribeEvents = ['onReady', 'onError', 'onStop'];

export function isMeteorCallbacks(callbacks: any): boolean {
    return isFunction(callbacks) || isCallbacksObject(callbacks);
}

// Checks if callbacks of {@link CallbacksObject} type.
export function isCallbacksObject(callbacks: any): boolean {
    return callbacks && subscribeEvents.some((event) => {
        return isFunction(callbacks[event]);
    });
}


