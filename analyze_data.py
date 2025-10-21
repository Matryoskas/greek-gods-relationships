import pandas as pd
import ast
import json
from collections import defaultdict, Counter

def safe_parse_list(value):
    """Safely parse a string representation of a list"""
    if pd.isna(value) or value == '[]' or value == '':
        return []
    try:
        # Handle both string lists with single quotes and JSON format
        if isinstance(value, str):
            parsed = ast.literal_eval(value)
            return parsed if isinstance(parsed, list) else []
        return []
    except:
        return []

def normalize_domain_name(domain):
    """Normalize domain names to have first letter capitalized"""
    if not domain or not isinstance(domain, str):
        return domain
    
    # Simple capitalization: just capitalize the first letter
    normalized = domain.strip()
    if normalized:
        return normalized[0].upper() + normalized[1:].lower()
    return domain

def normalize_character_type(char_type):
    """Normalize character type names to have first letter capitalized"""
    if not char_type or not isinstance(char_type, str):
        return char_type
    
    # Simple capitalization: just capitalize the first letter
    normalized = char_type.strip()
    if normalized:
        return normalized[0].upper() + normalized[1:]
    return char_type

def create_domain_groups():
    """Create meaningful domain groupings for analysis"""
    return {
        # Water & Sea domains
        "Water & Sea": [
            "sea", "river", "water", "oceans", "currents", "ocean"
        ],
        
        # War & Conflict
        "War & Conflict": [
            "war", "destruction", "conquest", "warcraft", "discord", "strife", 
            "bloodlust", "brutality", "violence", "conflict", "quarrels", "querrels", "enmity"
        ],

        "Forces of Nature": [
             "earthquakes", "earthquake", "fire", "volcanoes", "volcano"
        ],
        # Life, Renewal and Nature
        "Renewal & Nature": [
            "nature", "earth", "soil", "wildlife", 
            "wild animals", "forest", "trees", "flowers", "islands", "island", "mountains",
            "spring", "seasons", "fertility", "agriculture", "harvest",
            "grapevine", "winemaking", "beekeeping", "renewal", "vegetation", "plants", "growth", 
            "childbirth", "parturition", "motherhood", "horses"
        ],
        
        # Life & Death
        "Life & Death": [
           "underworld", "fate", "destiny", "doom", 
            "cycle of life", "souls", "soul", "abyss", "afterlife"
        ],
        
        # Love & Beauty
        "Love & Beauty": [
            "love", "beauty", "pleasure", "lust", "desire", "marriage", "riches", "victory"
        ],
        
        # Sky & Celestial
        "Sky & Celestial": [
            "sky", "sun", "moon", "stars", "daylight", "daytime", 
            "dawn", "night", "light", "lightning", "thunder", "clouds", 
            "rainbow", "astronomy", "air", "wind", "storms", "storm"
        ],
        
        # Knowledge & Arts
        "Knowledge & Arts": [
            "wisdom", "poetry", "music", "dance", "theater", "comedy", 
            "tragedy", "memory", "intellect", "study of history", 
            "history", "hymnos"
        ],
        

        # Justice & Law
        "Justice & Law": [
            "justice", "law", "punishment", "retribution", "sacred oaths", 
            "natural order", "civilization"
        ],
        
        # Crafts & Skills
        "Crafts & Skills": [
            "weaving", "handicraft", "archery", "hunting", 
            "forging", "healing", "medicine"
        ],
        
        # Home & Hospitality
        "Home & Hospitality": [
            "hearth", "home", "hospitality"
        ],

        "Patrons of Groups": [
            "women", "youth", "children", "mariners", "sailors", "farmers", "shepherds",
            "blacksmiths", "craftsmen", "artisans", "athletes", "musicians", "poets",
            "travelers", "traders", "thieves", "thief", "road", "roads", "trade"
        ],
        # Personification of Abstract Concepts
        "Abstract Concepts": [
            "sleep", "dream", "mental depression", 
            "anxiety", "mourning", "mockery", "praise", 
            "contemplation", "courage", "excellence", "virtue", "chastity", 
            "competitiveness", "emulation", "power",  "strength", "force", "compulsion",
            "primordial void", "time", "inevitability", "strategy", "peace", "harmony",
            "humanity"
        ],

        # Divine
        "Divine and Religion": [
            "prophecy", "witchcraft", "religious ecstasy", "festivity", 
            "rituals", "sacrifice", "oracles", "omens", "augury", "divination",
            "wine", "life", "death", "rebirth"
        ],
        
        # Negative Forces
        "Negative Forces": [
            "lie", "deceit", "lawlessness", "darkness", "oblivion", 
            "hunger", "need", "hardship", "poverty", "plague", "disease",
            "famine", "pestilence", "drought", "chaos", "despair", "ruin",
            "envy", "jealousy", "greed", "hatred", "revenge", "vengeance", "recklessness",
            "delusion", "mischief", "sorrow", "suffering", "misery"
        ],

        # Miscellaneous
        "Miscellaneous": [
            "labyrinth", "Europe", "echo"
        ]
    }

def group_domain(domain, domain_groups):
    """Map a specific domain to its broader group"""
    domain_lower = domain.lower().strip()
    
    for group_name, domain_list in domain_groups.items():
        if domain_lower in [d.lower() for d in domain_list]:
            return group_name
    
    # If no match found, return the original domain
    return domain

def analyze_comprehensive_data():
    """Generate comprehensive statistics for butterfly chart visualizations"""
    
    # Load datasets
    print("Loading datasets...")
    characters_df = pd.read_csv('datasets/unique_characters.csv')
    edges_df = pd.read_csv('datasets/edges_filtered.csv')
    
    print(f"Characters: {len(characters_df)}")
    print(f"Edges: {len(edges_df)}")
    
    # Initialize result structure
    analysis_results = {
        "metadata": {
            "total_characters": len(characters_df),
            "total_edges": len(edges_df),
            "generation_info": "Pre-computed statistics for butterfly chart visualizations"
        },
        "domain_analysis": {},
        "gender_analysis": {},
        "type_analysis": {},
        "author_analysis": {},
        "level_analysis": {},
        "cross_analysis": {}
    }
    
    # 1. DOMAIN ANALYSIS (with grouping)
    print("\n=== DOMAIN ANALYSIS ===")
    domain_groups = create_domain_groups()
    
    # Individual domain counts (original)
    individual_domain_counts = defaultdict(int)
    individual_domain_gender = defaultdict(lambda: defaultdict(int))
    
    # Grouped domain counts (new)
    grouped_domain_counts = defaultdict(int)
    grouped_domain_gender = defaultdict(lambda: defaultdict(int))
    grouped_domain_characters = defaultdict(list)  # Track characters in each grouped domain
    
    for _, char in characters_df.iterrows():
        domains = safe_parse_list(char['domain'])
        gender = char['gender'] if pd.notna(char['gender']) else 'unknown'
        char_name = char['name'] if pd.notna(char['name']) else 'Unknown'
        
        if not domains:
            individual_domain_counts['No Domain'] += 1
            individual_domain_gender['No Domain'][gender] += 1
            grouped_domain_counts['No Domain'] += 1
            grouped_domain_gender['No Domain'][gender] += 1
            grouped_domain_characters['No Domain'].append(char_name)
        else:
            processed_groups = set()  # Avoid double-counting if character has multiple domains in same group
            for domain in domains:
                # Normalize domain name for consistency
                normalized_domain = normalize_domain_name(domain)
                
                # Count individual domains (using normalized names)
                individual_domain_counts[normalized_domain] += 1
                individual_domain_gender[normalized_domain][gender] += 1
                
                # Count grouped domains
                group = group_domain(domain, domain_groups)
                if group not in processed_groups:
                    grouped_domain_counts[group] += 1
                    grouped_domain_gender[group][gender] += 1
                    grouped_domain_characters[group].append(char_name)
                    processed_groups.add(group)
    
    # Sort domains by count and get top 10 for both individual and grouped
    top_individual_domains = sorted(individual_domain_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    top_grouped_domains = sorted(grouped_domain_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Create filtered versions for display (excluding uninformative categories)
    top_individual_domains_filtered = [(name, count) for name, count in top_individual_domains if name != "No Domain"]
    top_grouped_domains_filtered = [(name, count) for name, count in top_grouped_domains if name != "No Domain"]
    
    analysis_results["domain_analysis"] = {
        "individual": {
            "total_domains": len(individual_domain_counts),
            "domain_counts": dict(individual_domain_counts),
            "top_domains": dict(top_individual_domains),
            "domain_gender_breakdown": {domain: dict(gender_dist) for domain, gender_dist in individual_domain_gender.items()}
        },
        "grouped": {
            "total_domain_groups": len(grouped_domain_counts),
            "domain_group_counts": dict(grouped_domain_counts),
            "top_domain_groups": dict(top_grouped_domains),
            "domain_group_gender_breakdown": {domain: dict(gender_dist) for domain, gender_dist in grouped_domain_gender.items()}
        },
        "domain_groups_mapping": domain_groups
    }
    
    print(f"Total unique individual domains: {len(individual_domain_counts)}")
    print("Top 5 informative individual domains (excluding 'No Domain'):")
    for domain, count in top_individual_domains_filtered[:6]:
        print(f"  {domain}: {count}")
    
    print(f"\nTotal domain groups: {len(grouped_domain_counts)}")
    print("Top 5 informative domain groups (excluding 'No Domain'):")
    for domain, count in top_grouped_domains_filtered[:6]:
        print(f"  {domain}: {count}")
    
    # 2. CHARACTER TYPE ANALYSIS
    print("\n=== CHARACTER TYPE ANALYSIS ===")
    type_counts = defaultdict(int)
    type_gender = defaultdict(lambda: defaultdict(int))
    
    for _, char in characters_df.iterrows():
        # Use hierarchical typing: level2 > level1 > 'Unknown'
        char_type = char['level2'] if pd.notna(char['level2']) else \
                   char['level1'] if pd.notna(char['level1']) else 'Others'
        
        # Normalize character type name
        normalized_char_type = normalize_character_type(char_type)
        
        gender = char['gender'] if pd.notna(char['gender']) else 'Others'
        
        type_counts[normalized_char_type] += 1
        type_gender[normalized_char_type][gender] += 1
    
    top_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Create filtered version for display (excluding uninformative categories)
    top_types_filtered = [(name, count) for name, count in top_types if name not in ["Others", "Unknown"]]
    
    analysis_results["type_analysis"] = {
        "total_types": len(type_counts),
        "type_counts": dict(type_counts),
        "top_types": dict(top_types),
        "type_gender_breakdown": {char_type: dict(gender_dist) for char_type, gender_dist in type_gender.items()}
    }
    
    print(f"Total character types: {len(type_counts)}")
    print("Top 5 informative character types (excluding 'Others'):")
    for char_type, count in top_types_filtered[:6]:
        print(f"  {char_type}: {count}")
    
    # 3. GENDER ANALYSIS (inclusive of all gender categories)
    print("\n=== GENDER ANALYSIS ===")
    
    # Create comprehensive gender counts including missing values
    gender_counts = defaultdict(int)
    for _, char in characters_df.iterrows():
        gender = char['gender'] if pd.notna(char['gender']) else 'unknown'
        gender_counts[gender] += 1
    
    gender_counts = dict(gender_counts)
    
    # Calculate percentages for all genders
    gender_percentages = {}
    for gender, count in gender_counts.items():
        gender_percentages[f"{gender}_percentage"] = round(count / len(characters_df) * 100, 1)
    
    analysis_results["gender_analysis"] = {
        "gender_distribution": gender_counts,
        **gender_percentages,
        "total_genders": len(gender_counts)
    }
    
    print("Gender distribution (inclusive):")
    for gender, count in sorted(gender_counts.items(), key=lambda x: x[1], reverse=True):
        percentage = count / len(characters_df) * 100
        print(f"  {gender}: {count} ({percentage:.1f}%)")
    
    # 4. AUTHOR ANALYSIS
    print("\n=== AUTHOR ANALYSIS ===")
    author_chars = defaultdict(set)
    author_edges = defaultdict(int)
    
    # Get unique characters per author from edges
    for _, edge in edges_df.iterrows():
        if pd.notna(edge['author']):
            author = edge['author']
            author_chars[author].add(edge['source'])
            author_chars[author].add(edge['target'])
            author_edges[author] += 1
    
    # Calculate gender distribution per author
    author_gender_stats = {}
    for author, char_names in author_chars.items():
        gender_count = defaultdict(int)
        for char_name in char_names:
            char_data = characters_df[characters_df['name'] == char_name]
            if not char_data.empty:
                gender = char_data.iloc[0]['gender']
                gender_count[gender if pd.notna(gender) else 'unknown'] += 1
        
        total_chars = sum(gender_count.values())
        author_gender_stats[author] = {
            "total_characters": total_chars,
            "total_edges": author_edges[author],
            "gender_counts": dict(gender_count),
            "male_percentage": round(gender_count['male'] / total_chars * 100, 1) if total_chars > 0 else 0,
            "female_percentage": round(gender_count['female'] / total_chars * 100, 1) if total_chars > 0 else 0
        }
    
    # Sort authors by character count
    top_authors = sorted(author_gender_stats.items(), 
                        key=lambda x: x[1]['total_characters'], 
                        reverse=True)[:10]
    
    analysis_results["author_analysis"] = {
        "total_authors": len(author_gender_stats),
        "author_stats": author_gender_stats,
        "top_authors_by_characters": dict(top_authors)
    }
    
    print(f"Total authors: {len(author_gender_stats)}")
    print("Top 5 authors by character count:")
    for author, stats in top_authors[:5]:
        print(f"  {author}: {stats['total_characters']} characters, {stats['total_edges']} edges")
    
    # 5. LEVEL HIERARCHY ANALYSIS
    print("\n=== LEVEL HIERARCHY ANALYSIS ===")
    level_counts = {}
    for level in ['level1', 'level2', 'level3', 'level4']:
        level_data = characters_df[level].value_counts().to_dict()
        level_counts[level] = level_data
    
    analysis_results["level_analysis"] = level_counts
    
    # 6. CROSS-ANALYSIS (Combinations for butterfly charts)
    print("\n=== GENERATING CROSS-ANALYSIS ===")
    cross_analysis = {}
    
    # Gender by top character types (using filtered types to exclude "Others")
    top_5_types = [t[0] for t in top_types_filtered[:6]]
    gender_by_type = {}
    for char_type in top_5_types:
        gender_by_type[char_type] = type_gender[char_type]
    
    # Gender by top authors
    top_5_authors = [a[0] for a in top_authors[:5]]
    gender_by_author = {}
    for author in top_5_authors:
        if author in author_gender_stats:
            gender_by_author[author] = author_gender_stats[author]['gender_counts']
    
    # Domain comparisons (use grouped domains)
    top_6_grouped_domains = [d[0] for d in top_grouped_domains[:6] if d[1] > 1]  # Only domains with more than 1 character
    top_6_individual_domains = [d[0] for d in top_individual_domains[:6] if d[1] > 1]
    
    cross_analysis = {
        "gender_by_type": gender_by_type,
        "gender_by_author": gender_by_author,
        "top_grouped_domains_for_comparison": top_6_grouped_domains,
        "top_individual_domains_for_comparison": top_6_individual_domains,
        "top_types_for_comparison": top_5_types,
        "top_authors_for_comparison": top_5_authors
    }
    
    analysis_results["cross_analysis"] = cross_analysis
    
    # 7. EXPORT RESULTS
    print("\n=== EXPORTING RESULTS ===")
    
    # Export comprehensive data
    with open('comprehensive_stats.json', 'w') as f:
        json.dump(analysis_results, f, indent=2, ensure_ascii=False)
    
    # Export simplified data for butterfly chart
    # Use the already filtered lists for more informative visualization
    butterfly_data = {
        "domains_grouped_by_gender": {
            name: {
                "male": grouped_domain_gender[name].get('male', 0),
                "female": grouped_domain_gender[name].get('female', 0),
                "characters": sorted(list(set(grouped_domain_characters[name])))  # Remove duplicates and sort
            }
            for name, count in top_grouped_domains_filtered[:6]
        },
        "domains_individual_by_gender": {
            name: {
                "male": individual_domain_gender[name].get('male', 0),
                "female": individual_domain_gender[name].get('female', 0)
            }
            for name, count in top_individual_domains_filtered[:6]
        },
        # Keep the original count-only versions for backwards compatibility
        "domains_grouped": {name: count for name, count in top_grouped_domains_filtered[:6]},
        "domains_individual": {name: count for name, count in top_individual_domains_filtered[:6]},
        "types": {name: count for name, count in top_types_filtered[:6]},
        "gender_by_author": {
            author: stats['gender_counts'] 
            for author, stats in list(author_gender_stats.items())[:6]
        },
        "gender_by_type": {
            char_type: dict(type_gender[char_type]) 
            for char_type in top_5_types
        },
        "overall_gender": gender_counts,
        "domain_groups_info": {
            "mapping": domain_groups,
            "grouped_counts": dict(grouped_domain_counts),
            "individual_counts": dict(individual_domain_counts)
        },
        # Metadata about gender inclusivity
        "gender_metadata": {
            "total_gender_categories": len(gender_counts),
            "supports_diverse_genders": True,
            "sample_diverse_genders": {
                "male": 274,
                "female": 171, 
                "unknown": gender_counts.get('unknown', 0),
                # Example of how system would handle additional genders
                "non-binary": 0,
                "genderfluid": 0,
                "agender": 0
            }
        }
    }
    
    with open('butterfly_data.json', 'w') as f:
        json.dump(butterfly_data, f, indent=2, ensure_ascii=False)
    
    print("✅ Exported comprehensive_stats.json (detailed analysis)")
    print("✅ Exported butterfly_data.json (simplified for visualization)")
    print(f"✅ Total data points analyzed: {len(characters_df)} characters, {len(edges_df)} relationships")
    
    return analysis_results

if __name__ == "__main__":
    results = analyze_comprehensive_data()