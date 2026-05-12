import type { NextPageContext } from 'next'

interface ErrorPageProps {
  statusCode?: number
}

function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>{statusCode || 'Błąd aplikacji'}</h1>
      <p>{statusCode === 404 ? 'Strona nie znaleziona' : 'Wystąpił błąd serwera'}</p>
    </div>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default ErrorPage
