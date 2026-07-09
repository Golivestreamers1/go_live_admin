import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const SectionDetailLink = ({ href, label = 'View details' }) => {
  if (!href) return null;

  return (
    <Link
      to={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {label}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
};

SectionDetailLink.propTypes = {
  href: PropTypes.string,
  label: PropTypes.string,
};

export default SectionDetailLink;
