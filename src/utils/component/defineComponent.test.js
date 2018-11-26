import path from 'path'
import { keys, prop } from '@serverless/utils'
import defineComponent from './defineComponent'
import { createTestContext } from '../../../test'

describe('#defineComponent()', () => {
  const cwd = path.resolve(__dirname, '..')
  const state = {}
  let context
  let Component

  beforeEach(async () => {
    context = await createTestContext({ cwd })
    Component = await context.import('Component')
  })

  it('should throw if the passed-in component is not of type Component', async () => {
    const Object = await context.import('Object')
    const object = await context.construct(Object, state, context)

    // TODO: rewrite to use `await expect toThrow`
    // for more info see: https://github.com/facebook/jest/issues/1377
    try {
      await defineComponent(object, state, context)
    } catch (error) {
      expect(error.message).toMatch(/expected component parameter to be a component/)
    }
  })

  it('should run the components "define" function', async () => {
    const Object = await context.import('Object')
    const component = await context.construct(Object, state, context)
    component.extends = 'Component'

    // adding the necessary properties so that the Object type turns into Component
    component.instanceId = +new Date()
    component.hydrate = jest.fn() // TODO: remove once `hydrate` is removed from core
    component.construct = jest.fn()
    component.deploy = jest.fn()
    component.remove = jest.fn()
    component.define = () => ({
      myComponent1: {
        type: '../../registry/Component',
        inputs: {}
      },
      components: {
        myComponent2: {
          type: '../../registry/Component',
          inputs: {}
        }
      },
      functions: {
        myFunction1: {
          type: '../../registry/Component',
          inputs: {}
        },
        myFunction2: {
          type: '../../registry/Component',
          inputs: {}
        }
      }
    })

    const res = await defineComponent(component, state, context)

    // NOTE: this Object was extended above to be our customized Component
    expect(res).toBeInstanceOf(Object.class)
    expect(keys(prop('children', res))).toHaveLength(4)
    expect(res.children.myComponent1).toBeInstanceOf(Component.class)
    expect(res.children.myComponent2).toBeInstanceOf(Component.class)
    expect(res.children.myFunction1).toBeInstanceOf(Component.class)
    expect(res.children.myFunction2).toBeInstanceOf(Component.class)
  })
})
