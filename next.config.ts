import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Génération des PDF côté serveur : la bibliothèque reste hors du bundle.
  serverExternalPackages: ['@react-pdf/renderer'],
  // Les polices du CV sont lues sur le disque au moment de générer le PDF : on les inclut au déploiement.
  outputFileTracingIncludes: { '/api/resume/[id]/pdf': ['./src/lib/resume/fonts/**'] },
  experimental: {
    serverActions: { bodySizeLimit: '6mb' } // import de CV (PDF)
  }
};

export default withNextIntl(nextConfig);
