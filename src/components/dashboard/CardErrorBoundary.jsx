import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle } from 'lucide-react';

/**
 * Error boundary that isolates a single dashboard card.
 * If a card throws during render, we show a small error tile instead of unmounting the whole page.
 */
export default class CardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error(`[${this.props.name || 'Card'}] crashed:`, error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            {this.props.name || 'Card'} failed to render
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {this.state.error?.message || String(this.state.error)}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-3 rounded-md border px-3 py-1 text-xs hover:bg-gray-50"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }
}
