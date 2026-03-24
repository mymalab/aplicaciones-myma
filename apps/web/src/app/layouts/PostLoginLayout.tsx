import React from 'react';
import AppShellHeader from '@shared/layout/AppShellHeader';

interface PostLoginLayoutProps {
  children: React.ReactNode;
}

const PostLoginLayout: React.FC<PostLoginLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppShellHeader />
      {children}
    </div>
  );
};

export default PostLoginLayout;
