import { Component } from 'react'
import { isTransientLessonAssetError } from './lessonStaticAssetRetry'

export default class LessonAssetLoadBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    const knownTransient = isTransientLessonAssetError(this.state.error)
    return (
      <section role="alert" data-lesson-asset-retry-required
        style={{ padding: 24, maxWidth: 650, margin: 'auto' }}>
        <h2>{knownTransient ? 'Lesson Planning could not load' : 'Lesson Planning is temporarily unavailable'}</h2>
        <p>We did not save, publish, or change any school records.</p>
        <p>{knownTransient
          ? 'Your browser could not load a protected page asset. Check the connection and retry the page.'
          : 'An unexpected error occurred. The original record is unchanged.'}
        </p>
        <p role="note">Retry reloads this page. Any unsaved changes in this browser tab may be lost.</p>
        <button type="button" onClick={() => window.location.replace(
          window.location.pathname + window.location.search
        )}>Retry this page</button>
      </section>
    )
  }
}
