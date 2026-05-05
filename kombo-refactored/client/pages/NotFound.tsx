import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center section-padding">
        <div className="container-premium">
          <div className="glass-card border-2 border-primary/30 p-12 rounded-3xl text-center space-y-8 max-w-2xl mx-auto">
            <div className="text-9xl font-bold gradient-text mb-4">404</div>

            <div>
              <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
              <p className="text-lg text-foreground/70">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>

            <Link to="/" className="btn-primary inline-block">
              Return to Home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
