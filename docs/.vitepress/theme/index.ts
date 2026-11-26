import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import BriefBuilder from './components/BriefBuilder.vue'
import Checklist from './components/Checklist.vue'
import QuizCard from './components/QuizCard.vue'
import VideoPlayer from './components/VideoPlayer.vue'
import ChatMessage from './components/chat/ChatMessage.vue'
import ChatThread from './components/chat/ChatThread.vue'
import PromptVersions from './components/chat/PromptVersions.vue'
import BookCover from './components/BookCover.vue'
import ShelfGroup from './components/ShelfGroup.vue'
import InkFigure from './components/InkFigure.vue'
import StepPlayer from './components/StepPlayer.vue'
import GitFlowDemo from './components/GitFlowDemo.vue'
import ChapterMark from './components/ChapterMark.vue'
import ReadingProgress from './components/ReadingProgress.vue'
import PageMeta from './components/PageMeta.vue'
import VibeShowcase from './components/VibeShowcase.vue'
import RepoSimulator from './components/RepoSimulator.vue'
import './custom.css'
import './tailwind.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('BriefBuilder', BriefBuilder)
    app.component('Checklist', Checklist)
    app.component('QuizCard', QuizCard)
    app.component('VideoPlayer', VideoPlayer)
    app.component('ChatMessage', ChatMessage)
    app.component('ChatThread', ChatThread)
    app.component('PromptVersions', PromptVersions)
    app.component('BookCover', BookCover)
    app.component('ShelfGroup', ShelfGroup)
    app.component('InkFigure', InkFigure)
    app.component('StepPlayer', StepPlayer)
    app.component('GitFlowDemo', GitFlowDemo)
    app.component('ChapterMark', ChapterMark)
    app.component('ReadingProgress', ReadingProgress)
    app.component('PageMeta', PageMeta)
    app.component('VibeShowcase', VibeShowcase)
    app.component('RepoSimulator', RepoSimulator)
  },
} satisfies Theme
