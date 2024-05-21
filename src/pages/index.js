import Head from 'next/head';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/dist/server/api-utils';
export default function Home() {
  const { isLoading, error, user } = useUser();
  if (isLoading) return <div>is Loading</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <>
      <Head>
        <title>ACG</title>
      </Head>
      <div className="flex justify-center items-center min-h-screen w-full bg-gray-800 text-white text-center">
        <div>
          {!user && (
            <>
              <Link href="/api/auth/login" className="btn" alt="Sign up Button">
                Login
              </Link>
            </>
          )}
          {!!user && <Link href="/api/auth/logout">logout</Link>}
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  // Fetch data from an API
  const session = await getSession(context.req, context.res);
  if (!!session) {
    return {
      redirect: {
        destination: '/chat',
      },
    };
  }

  return {
    props: {},
  };

  // Pass data to the page via props
  return { props: { data } };
}
