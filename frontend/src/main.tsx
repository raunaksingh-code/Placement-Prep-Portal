import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Layout from './app/Layout.tsx'
import { LoginPage, RegisterPage } from './features/auth/AuthPages.tsx'
import HomePage from './features/home/HomePage.tsx'
import SubjectListPage from './features/learning/SubjectListPage.tsx'
import TopicListPage from './features/learning/TopicListPage.tsx'
import TopicDetailPage from './features/learning/TopicDetailPage.tsx'
import PracticePage from './features/practice/PracticePage.tsx'
import TestPage from './features/practice/TestPage.tsx'
import ResultPage from './features/practice/ResultPage.tsx'
import MockTestListPage from './features/practice/MockTestListPage.tsx'
import ProgressPage from './features/progress/ProgressPage.tsx'
import GuideListPage from './features/guides/GuideListPage.tsx'
import GuideDetailPage from './features/guides/GuideDetailPage.tsx'
import CompanyListPage from './features/companies/CompanyListPage.tsx'
import CompanyDetailPage from './features/companies/CompanyDetailPage.tsx'
import JDDetailPage from './features/companies/JDDetailPage.tsx'
import QuestionBankPage from './features/companies/QuestionBankPage.tsx'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'aptitude', element: <SubjectListPage /> },
      { path: 'subjects/:slug', element: <TopicListPage /> },
      { path: 'topics/:slug', element: <TopicDetailPage /> },
      { path: 'topics/:slug/practice', element: <PracticePage /> },
      { path: 'mock-tests', element: <MockTestListPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'interview-prep', element: <GuideListPage /> },
      { path: 'interview-prep/:slug', element: <GuideDetailPage /> },
      { path: 'tests/:testId', element: <TestPage /> },
      { path: 'attempts/:attemptId', element: <ResultPage /> },
      { path: 'companies', element: <CompanyListPage /> },
      { path: 'companies/:slug', element: <CompanyDetailPage /> },
      { path: 'jds/:slug', element: <JDDetailPage /> },
      { path: 'question-bank', element: <QuestionBankPage /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
