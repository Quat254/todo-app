import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCTS = [
  {
    id: 'tea-tree',
    name: 'Tea Tree Oil (diluted)',
    issueKey: 'acne',
    priceKes: 1200,
    size: '30 ml',
    description: 'Targets acne-causing bacteria and calms inflamed breakouts.',
  },
  {
    id: 'jojoba',
    name: 'Jojoba Oil',
    issueKey: 'oily skin',
    priceKes: 1500,
    size: '50 ml',
    description: 'Balances sebum production and feels light on the skin.',
  },
  {
    id: 'argan',
    name: 'Argan Oil',
    issueKey: 'dryness',
    priceKes: 1800,
    size: '30 ml',
    description: 'Deep hydration for dry or flaky skin.',
  },
  {
    id: 'rosehip',
    name: 'Rosehip Seed Oil',
    issueKey: 'dark spots',
    priceKes: 2000,
    size: '30 ml',
    description: 'Helps fade dark spots and improve texture over time.',
  },
  {
    id: 'squalane',
    name: 'Squalane Oil',
    issueKey: 'sensitivity',
    priceKes: 2200,
    size: '50 ml',
    description: 'Ultra-gentle hydration for sensitive or reactive skin.',
  },
];

export default function SearchScreen() {
  const [user, setUser] = useState<any | null>(null);
  const [historyIssues, setHistoryIssues] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const rawUser = await AsyncStorage.getItem('@faceme_user');
        if (!rawUser) return;
        const parsedUser = JSON.parse(rawUser);
        setUser(parsedUser);

        const historyKey = `@faceme_history_${parsedUser.id}`;
        const rawHistory = await AsyncStorage.getItem(historyKey);
        if (!rawHistory) return;
        const parsedHistory = JSON.parse(rawHistory) as any[];
        const last = parsedHistory[parsedHistory.length - 1];
        if (!last) return;

        const collected = new Set<string>();
        last.faces.forEach((face: any) => {
          (face.recommendations || []).forEach((rec: any) => {
            if (rec.issue) {
              collected.add(rec.issue.toString().toLowerCase());
            }
          });
        });
        setHistoryIssues(Array.from(collected));
      } catch (e) {
        console.warn('Failed to load search history', e);
      }
    };

    load();
  }, []);

  const recommendedProducts = useMemo(() => {
    if (historyIssues.length === 0) return PRODUCTS;

    const meaningfulIssues = historyIssues
      .map((issue) => issue?.toLowerCase()?.trim())
      .filter((issue) => issue && issue !== 'balanced');

    if (meaningfulIssues.length === 0) {
      // Only "balanced" (generic) was detected, so show the full catalog.
      return PRODUCTS;
    }

    return PRODUCTS.filter((p) =>
      meaningfulIssues.some((issue) =>
        issue.includes(p.issueKey.toLowerCase())
      )
    );
  }, [historyIssues]);

  const visibleProducts = useMemo(() => {
    const base = recommendedProducts;
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [recommendedProducts, query]);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>
        {user ? 'Recommended oils for you' : 'Search facial oils'}
      </Text>
      <Text style={styles.subtitle}>
        {user
          ? 'Based on your latest face analysis. Prices shown in Kenyan shillings (KES).'
          : 'Browse oils and see prices in Kenyan shillings (KES).'}
      </Text>

      <View style={styles.searchBox}>
        <TextInput
          placeholder="Search oil by name or benefit"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {visibleProducts.map((product) => (
          <TouchableOpacity key={product.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.oilThumbnail} />
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardName}>{product.name}</Text>
              <Text style={styles.cardMeta}>
                {product.size} • Recommended for {product.issueKey}
              </Text>
              <Text style={styles.cardDescription}>{product.description}</Text>
              <Text style={styles.cardPrice}>
                KES {product.priceKes.toLocaleString('en-KE')}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {visibleProducts.length === 0 && (
          <Text style={styles.emptyText}>
            No products match your search yet. Try a different keyword.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
    backgroundColor: '#E6F4FE',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    color: '#020617',
  },
  subtitle: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 16,
  },
  searchBox: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    fontSize: 14,
  },
  list: {
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  cardLeft: {
    marginRight: 12,
    justifyContent: 'center',
  },
  oilThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#d1f4e0',
  },
  cardRight: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#020617',
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 6,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0C7686',
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 20,
    textAlign: 'center',
  },
});

