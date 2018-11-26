import {
  forEach,
  get,
  isFunction,
  isObject,
  map,
  or,
  resolve,
  clone,
  set,
  walkReduceDepthFirst
} from '@serverless/utils'
// import appendKey from './appendKey'
// import getKey from './getKey'
import isTypeConstruct from '../type/isTypeConstruct'
import hydrateComponent from './hydrateComponent'
import isComponent from './isComponent'
import { SYMBOL_STATE } from '../constants'
// import setKey from './setKey'

/**
 *
 */
const defineComponent = async (component, state, context) => {
  // TODO BRN: If we ever need to retrigger define (redefine) hydrating state here may be an issue
  if (!isComponent(component)) {
    throw new TypeError(
      `defineComponent expected component parameter to be a component. Instead received ${component}`
    )
  }

  // if this is the first deployment
  // confirm that the resource does not exist on the provider
  // otherwise, sync the state
  if (state === undefined) {
    const componentClone = clone(component)
    const status = await componentClone.sync(context)

    if (status !== 'removed' && status !== 'unknown') {
      state = componentClone
      component[SYMBOL_STATE] = state
    }
  }

  component = hydrateComponent(component, state, context)

  if (isFunction(component.define)) {
    let children = await or(component.define(context), {})
    children = await walkReduceDepthFirst(
      async (accum, value, pathParts) => {
        const propName = pathParts.slice(-1)[0]
        if (isTypeConstruct(value)) {
          const child = await context.import(value.type)
          const instance = await context.construct(child, value.inputs)
          return set(propName, instance, accum)
        } else if (isComponent(value)) {
          const instance = resolve(value)
          return set(propName, instance, accum)
        }
        return accum
      },
      {},
      children
    )

    if (isObject(children)) {
      forEach((child) => {
        // TODO BRN: Look for children that already have parents. If this is the case then someone has returned a child from define that was defined by another component (possibly passed along as a variable)
        child.parent = component
        // child = setKey(appendKey(getKey(component), kdx), child)
      }, children)
    } else {
      throw new Error(
        `define() method must return either an object or an array. Instead received ${children} from ${component}.`
      )
    }

    component.children = await map(
      async (child, key) => defineComponent(child, get(['children', key], state), context),
      children
    )
  }

  return component
}

export default defineComponent
