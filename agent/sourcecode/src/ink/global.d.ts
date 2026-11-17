import type { PropsWithChildren, RefAttributes } from 'react'
import type { DOMElement } from './dom.js'
import type { EventHandlerProps } from './events/event-handlers.js'
import type { Styles, TextStyles } from './styles.js'

// Host attributes used by the existing components and consumed by reconciler.ts.
// These are terminal nodes, so browser DOM attributes and events do not apply.
type HostProps = PropsWithChildren<RefAttributes<DOMElement>> & {
  style?: Styles
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'ink-box': HostProps & EventHandlerProps & {
        tabIndex?: number
        autoFocus?: boolean
        stickyScroll?: boolean
      }
      'ink-text': HostProps & {
        textStyles?: TextStyles
      }
      'ink-link': HostProps & {
        href: string
      }
      'ink-raw-ansi': HostProps & {
        rawText: string
        rawWidth: number
        rawHeight: number
      }
    }
  }
}
