import sys

def check_balance(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
    
    brace_balance = 0
    paren_balance = 0
    for i, line in enumerate(lines):
        for char in line:
            if char == '{': brace_balance += 1
            if char == '}': brace_balance -= 1
            if char == '(': paren_balance += 1
            if char == ')': paren_balance -= 1
        
        if brace_balance < 0:
            print(f"Brace imbalance at line {i+1}: {brace_balance}")
            # Reset to continue and find if it happens again
            brace_balance = 0
        if paren_balance < 0:
            print(f"Paren imbalance at line {i+1}: {paren_balance}")
            paren_balance = 0
    
    print(f"Final Balance - Braces: {brace_balance}, Parens: {paren_balance}")

if __name__ == '__main__':
    check_balance(sys.argv[1])
