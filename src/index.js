/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @typedef {import('virtual-dom').VNode} VNode
 * @typedef {import('virtual-dom').VProperties} VProperties
 * @typedef {import('nlcst').Parent} NlcstParent
 * @typedef {import('nlcst').Root} NlcstRoot
 * @typedef {import('nlcst').Content} NlcstContent
 * @typedef {NlcstRoot | NlcstContent} NlcstNode
 */

import virtualDom from 'virtual-dom'
import {unified} from 'unified'
import retextEnglish from 'retext-english'
import {visit} from 'unist-util-visit'
import debounce from 'debounce'

const {create, h, diff, patch} = virtualDom

const processor = unified().use(retextEnglish)
const hue = hues()
const main = document.querySelectorAll('main')[0]
let tree = render(document.querySelectorAll('template')[0].innerHTML)
let dom = main.appendChild(create(tree))

/**
 * @param {KeyboardEvent|MouseEvent|ClipboardEvent} ev
 */
function onchange(ev) {
  if (
    ev &&
    ev.target &&
    'value' in ev.target &&
    typeof ev.target.value === 'string'
  ) {
    const next = render(ev.target.value)
    dom = patch(dom, diff(tree, next))
    tree = next
  }
}

function resize() {
  const textarea = dom.querySelector('textarea')
  const draw = dom.querySelector('.draw')
  if (!textarea) throw new Error('Expected `textarea` `dom`')
  if (!draw) throw new Error('Expected `.draw` in `dom`')
  const result = rows(draw)
  if (result !== undefined) textarea.rows = result
}

/**
 * @param {string} text
 * @returns {VNode}
 */
function render(text) {
  const tree = processor.runSync(processor.parse(text))
  const change = debounce(onchange, 4)
  let key = 0

  setTimeout(resize, 4)

  return h('div', [
    h('section.highlight', [h('h1', {key: 'title'}, 'write music')]),
    h('div', {key: 'editor', className: 'editor'}, [
      h('div', {key: 'draw', className: 'draw'}, pad(all(tree, []))),
      h(
        'textarea',
        {
          key: 'area',
          value: text,
          oninput: change,
          onpaste: change,
          onkeyup: change,
          onmouseup: change
        },
        []
      )
    ]),
    h('section.highlight', [
      h('p', {key: 'byline'}, [
        'Based on a tip by ',
        h('a', {href: 'https://www.garyprovost.com'}, 'Gary Provost'),
        ' (“Vary sentence length”), and a ',
        h(
          'a',
          {href: 'https://www.helpscout.net/blog/damn-hard-writing/'},
          'visualisation by Gregory Ciotti'
        ),
        '.'
      ]),
      h('p', {key: 'ps'}, ['P.S. You can edit the text above.'])
    ]),
    h('section.credits', {key: 'credits'}, [
      h('p', [
        h(
          'a',
          {href: 'https://github.com/wooorm/write-music'},
          'Fork this website'
        ),
        ' • ',
        h(
          'a',
          {href: 'https://github.com/wooorm/write-music/blob/src/license'},
          'MIT'
        ),
        ' • ',
        h('a', {href: 'https://wooorm.com'}, '@wooorm')
      ])
    ])
  ])

  /**
   * @param {NlcstParent} node
   * @param {Array<number>} parentIds
   * @returns {Array<VNode|string>}
   */
  function all(node, parentIds) {
    const children = node.children
    const length = children.length
    let index = -1
    /** @type {Array<VNode|string>} */
    const results = []

    while (++index < length) {
      const ids = [...parentIds, index]
      const result = one(children[index], ids)

      if (Array.isArray(result)) {
        results.push(...result)
      } else {
        results.push(result)
      }
    }

    return results
  }

  /**
   * @param {NlcstNode} node
   * @param {Array<number>} parentIds
   * @returns {string|VNode|Array<VNode|string>}
   */
  function one(node, parentIds) {
    /** @type {string|VNode|Array<VNode|string>} */
    let result = 'value' in node ? node.value : all(node, parentIds)
    const styles = style(node)
    const id = parentIds.join('-') + '-' + key

    if (styles) {
      result = h('span', {key: id, style: styles}, result)
      key++
    }

    return result
  }

  /**
   * Trailing white-space in a `textarea` is shown, but not in a `div` with
   * `white-space: pre-wrap`.
   * Add a `br` to make the last newline explicit.
   *
   * @param {Array<VNode|string>} nodes
   * @returns {Array<VNode|string>}
   */
  function pad(nodes) {
    const tail = nodes[nodes.length - 1]

    if (typeof tail === 'string' && tail.charAt(tail.length - 1) === '\n') {
      nodes.push(h('br', {key: 'break'}, []))
    }

    return nodes
  }
}

/**
 * @param {NlcstNode} node
 * @returns {Record<string, string>|void}
 */
function style(node) {
  if (node.type === 'SentenceNode') {
    return {
      backgroundColor: color(count(node))
    }
  }
}

/**
 * @param {NlcstParent} node
 * @returns {number}
 */
function count(node) {
  let value = 0

  visit(node, 'WordNode', add)

  return value

  function add() {
    value++
  }
}

/**
 * @param {number} count
 * @returns {string}
 */

function color(count) {
  const value = count < hue.length ? hue[count] : hue[hue.length - 1]
  return 'hsl(' + [value, '93%', '70%', 0.5].join(', ') + ')'
}

/** @returns {Array<number>} */
function hues() {
  return Array.from({length: 120}, (_, i) => {
    if (i < 3) return 30
    if (i < 6) return 60
    if (i < 9) return 90
    if (i < 12) return 120
    if (i < 18) return 150
    if (i < 24) return 180
    if (i < 30) return 210
    if (i < 40) return 240
    if (i < 50) return 270
    if (i < 60) return 300
    return 330
  })
}

/**
 * @param {Element|null} node
 * @returns {number|void}
 */
function rows(node) {
  if (!node || node.nodeType !== document.ELEMENT_NODE) {
    return
  }

  return Math.ceil(
    node.getBoundingClientRect().height /
      Number.parseInt(window.getComputedStyle(node).lineHeight, 10)
  )
}
