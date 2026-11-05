import type {} from '../../src/ink/global.d.ts'
import { createRef } from 'react'
import type { DOMElement } from '../../src/ink/dom.js'
import type { ClickEvent } from '../../src/ink/events/click-event.js'
import type { KeyboardEvent } from '../../src/ink/events/keyboard-event.js'

const nodeRef = createRef<DOMElement>()

const layout = <ink-box
  ref={nodeRef}
  tabIndex={0}
  autoFocus
  stickyScroll
  style={{ flexDirection: 'column', width: '100%', overflowY: 'scroll' }}
  onClick={event => {
    const click: ClickEvent = event
    click.stopImmediatePropagation()
    const column: number = click.localCol
    void column
  }}
  onKeyDown={event => {
    const key: KeyboardEvent = event
    key.preventDefault()
    const ctrl: boolean = key.ctrl
    void ctrl
  }}
>
  <ink-text textStyles={{ color: 'ansi:green', bold: true }}>Ready</ink-text>
  <ink-link href="https://example.com">Documentation</ink-link>
  <ink-raw-ansi rawText="ready" rawWidth={5} rawHeight={1} />
</ink-box>
void layout

// @ts-expect-error Layout widths follow the existing Styles contract.
const badWidth = <ink-box style={{ width: true }} />
// @ts-expect-error The ref points to a terminal DOMElement, not a browser node.
const badRef = <ink-box ref={createRef<HTMLDivElement>()} />
// @ts-expect-error Keyboard handlers receive the terminal event, not a string.
const badHandler = <ink-box onKeyDown={(event: string) => { void event }} />
// @ts-expect-error Scroll state is boolean.
const badScroll = <ink-box stickyScroll="true" />
// @ts-expect-error Text styles retain the existing Color union.
const badColor = <ink-text textStyles={{ color: 'not-a-color' }} />
// @ts-expect-error Link rendering requires its target URL.
const missingHref = <ink-link>Documentation</ink-link>
// @ts-expect-error Raw ANSI geometry is measured in numbers.
const badRawWidth = <ink-raw-ansi rawText="ready" rawWidth="5" rawHeight={1} />
// @ts-expect-error Raw ANSI rendering needs its measured height.
const missingRawHeight = <ink-raw-ansi rawText="ready" rawWidth={5} />
// @ts-expect-error Host props have no arbitrary attribute index signature.
const badAttribute = <ink-box unknownAttribute="value" />
// @ts-expect-error Unregistered terminal element names must remain errors.
const unknownElement = <ink-unknown />
void [badWidth, badRef, badHandler, badScroll, badColor, missingHref,
  badRawWidth, missingRawHeight, badAttribute, unknownElement]
