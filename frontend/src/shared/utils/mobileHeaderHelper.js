export const showMobileHeader = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lnf:show-mobile-header'));
  }
};

export default showMobileHeader;
