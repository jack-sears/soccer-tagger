import pandas as pd
pd.set_option('display.max_columns', None)

def analyze_player_actions(csv_path):
    # Load the event data
    df = pd.read_csv(csv_path)
    
    # Only keep relevant columns if needed
    df = df[['player', 'eventType', 'outcome']]

    # Define the actions we care about
    actions = ['Pass', 'Clearance', 'Shot']
    
    results = []
    
    for player, group in df.groupby('player'):
        player_stats = {'player': player}
        
        for action in actions:
            action_events = group[group['eventType'] == action]
            total = len(action_events)
            successful = len(action_events[action_events['outcome'].str.lower() == 'success'])
            unsuccessful = total - successful
            
            player_stats[f'{action.lower()}_total'] = total
            player_stats[f'{action.lower()}_success'] = successful
            player_stats[f'{action.lower()}_unsuccessful'] = unsuccessful
        
        results.append(player_stats)
    
    # Convert results to a DataFrame for easy viewing
    summary_df = pd.DataFrame(results)
    return summary_df

# Example usage:
summary = analyze_player_actions("events.csv")
print(summary)
