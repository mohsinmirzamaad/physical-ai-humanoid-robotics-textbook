import React from 'react';
import ContentOriginal from '@theme-original/DocItem/Content';
import PersonalizeButton from '@site/src/components/PersonalizeButton';
import TranslateButton from '@site/src/components/TranslateButton';
import { useDoc } from '@docusaurus/plugin-content-docs/client';

type Props = React.ComponentProps<typeof ContentOriginal>;

export default function DocItemContentWrapper(props: Props) {
  const { metadata } = useDoc();
  return (
    <>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <PersonalizeButton chapterSlug={metadata.id} />
        <TranslateButton />
      </div>
      <ContentOriginal {...props} />
    </>
  );
}
