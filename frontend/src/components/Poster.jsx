import { useState } from 'react';
import Icon from './Icon';

export default function Poster({ src, alt = '', className = '', loading = 'lazy' }) {
  const [failedSource, setFailedSource] = useState(null);
  return src && failedSource !== src
    ? <img src={src} alt={alt} loading={loading} className={className} onError={() => setFailedSource(src)} />
    : <div className={`poster-fallback ${className}`} role={alt ? 'img' : undefined} aria-label={alt || undefined}><Icon name="film" size={36} /><span>ANIMEHUB</span></div>;
}
