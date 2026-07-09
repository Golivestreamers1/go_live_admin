import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import AuditStatusBadge from './AuditStatusBadge';

const PlatformAuditMetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  status,
  loading,
  href,
  linkLabel = 'Open',
}) => {
  const content = (
    <Card className={href ? 'h-full transition-shadow hover:shadow-md' : undefined}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 truncate text-2xl font-bold text-gray-900">
              {loading ? '—' : value}
            </p>
            {subtitle ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {Icon ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
        </div>
        {status && !loading ? (
          <div className="mt-3">
            <AuditStatusBadge status={status} />
          </div>
        ) : null}
        {href && !loading ? (
          <p className="mt-3 text-xs font-medium text-primary">{linkLabel} →</p>
        ) : null}
      </CardContent>
    </Card>
  );

  if (href && !loading) {
    return (
      <Link to={href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        {content}
      </Link>
    );
  }

  return content;
};

PlatformAuditMetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.elementType,
  status: PropTypes.string,
  loading: PropTypes.bool,
  href: PropTypes.string,
  linkLabel: PropTypes.string,
};

export default PlatformAuditMetricCard;
